use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, patch, post},
    Json, Router,
};

use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash,
        PasswordHasher,
        PasswordVerifier,
        SaltString,
    },
    Argon2,
};

use jsonwebtoken::{
    encode,
    EncodingKey,
    Header,
};

use serde::{Deserialize, Serialize};

use sqlx::query_as;

use crate::{
    models::{
        AuthResponse,
        LoginRequest,
        Profile,
        RegisterRequest,
        UpdateProfileRequest,
        UpdateRoleRequest,
        UserSummary,
    },
    AppState,
};

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: i32,
    exp: usize,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/profile", get(get_profile).patch(update_profile))
        .route("/users", get(list_users))
        .route("/users/{id}/role", patch(update_role))
}

fn get_user_id(
    headers: &axum::http::HeaderMap,
    secret: &str,
) -> Result<i32, (StatusCode, String)> {
    let authorization = headers
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or((
            StatusCode::UNAUTHORIZED,
            "Authorization required".to_string(),
        ))?;

    let token = authorization.strip_prefix("Bearer ").ok_or((
        StatusCode::UNAUTHORIZED,
        "Invalid authorization header".to_string(),
    ))?;

    let token_data = jsonwebtoken::decode::<Claims>(
        token,
        &jsonwebtoken::DecodingKey::from_secret(secret.as_bytes()),
        &jsonwebtoken::Validation::default(),
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

    Ok(token_data.claims.sub)
}

async fn register(
    State(state): State<AppState>,
    Json(data): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {

    let password_hash =
        hash_password(&data.password)?;

    let user = query_as::<_, (i32, String, String)>(
        "INSERT INTO users (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username, role"
    )
    .bind(&data.username)
    .bind(password_hash)
    .fetch_one(&state.pool)
    .await
    .map_err(|error| {
        (
            StatusCode::BAD_REQUEST,
            error.to_string(),
        )
    })?;

    let token =
        create_token(user.0, &state.jwt_secret)?;

    Ok(Json(AuthResponse {
        token,
        user_id: user.0,
        username: user.1,
        role: user.2,
    }))
}

async fn login(
    State(state): State<AppState>,
    Json(data): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {

    let user = query_as::<_, (i32, String, String, String)>(
        "SELECT id, username, password_hash, role
         FROM users
         WHERE username = $1"
    )
    .bind(&data.username)
    .fetch_optional(&state.pool)
    .await
    .map_err(|error| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error.to_string(),
        )
    })?;

    let Some((id, username, password_hash, role)) = user else {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Invalid username or password".to_string(),
        ));
    };

    verify_password(
        &data.password,
        &password_hash,
    )?;

    let token =
        create_token(id, &state.jwt_secret)?;

    Ok(Json(AuthResponse {
        token,
        user_id: id,
        username,
        role,
    }))
}

async fn get_profile(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> Result<Json<Profile>, (StatusCode, String)> {
    let user_id = get_user_id(&headers, &state.jwt_secret)?;
    let profile = query_as::<_, Profile>(
        "SELECT id, username, role, avatar_url FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| (StatusCode::NOT_FOUND, "User not found".to_string()))?;

    Ok(Json(profile))
}

async fn update_profile(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(data): Json<UpdateProfileRequest>,
) -> Result<Json<Profile>, (StatusCode, String)> {
    let user_id = get_user_id(&headers, &state.jwt_secret)?;
    let profile = query_as::<_, Profile>(
        "UPDATE users SET avatar_url = $1
         WHERE id = $2
         RETURNING id, username, role, avatar_url",
    )
    .bind(data.avatar_url)
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| (StatusCode::BAD_REQUEST, "Could not update profile".to_string()))?;

    Ok(Json(profile))
}

async fn list_users(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> Result<Json<Vec<UserSummary>>, (StatusCode, String)> {
    get_user_id(&headers, &state.jwt_secret)?;
    let users = query_as::<_, UserSummary>(
        "SELECT id, username, role FROM users ORDER BY username",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    Ok(Json(users))
}

async fn update_role(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(user_id): Path<i32>,
    Json(data): Json<UpdateRoleRequest>,
) -> Result<Json<UserSummary>, (StatusCode, String)> {
    let current_user_id = get_user_id(&headers, &state.jwt_secret)?;
    let is_admin: bool = sqlx::query_scalar(
        "SELECT role = 'admin' FROM users WHERE id = $1",
    )
    .bind(current_user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| (StatusCode::FORBIDDEN, "Admin role required".to_string()))?;

    if !is_admin || !["user", "manager", "admin"].contains(&data.role.as_str()) {
        return Err((StatusCode::FORBIDDEN, "Insufficient permissions".to_string()));
    }

    let user = query_as::<_, UserSummary>(
        "UPDATE users SET role = $1 WHERE id = $2
         RETURNING id, username, role",
    )
    .bind(data.role)
    .bind(user_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| (StatusCode::NOT_FOUND, "User not found".to_string()))?;

    Ok(Json(user))
}

fn hash_password(
    password: &str,
) -> Result<String, (StatusCode, String)> {

    let salt =
        SaltString::generate(&mut OsRng);

    Argon2::default()
        .hash_password(
            password.as_bytes(),
            &salt,
        )
        .map(|hash| hash.to_string())
        .map_err(|error| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                error.to_string(),
            )
        })
}

fn verify_password(
    password: &str,
    hash: &str,
) -> Result<(), (StatusCode, String)> {

    let parsed_hash =
        PasswordHash::new(hash)
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Invalid password hash".to_string(),
                )
            })?;

    Argon2::default()
        .verify_password(
            password.as_bytes(),
            &parsed_hash,
        )
        .map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                "Invalid username or password".to_string(),
            )
        })
}

fn create_token(
    user_id: i32,
    secret: &str,
) -> Result<String, (StatusCode, String)> {

    let claims = Claims {
        sub: user_id,
        exp: 2_000_000_000,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(
            secret.as_bytes()
        ),
    )
    .map_err(|error| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error.to_string(),
        )
    })
}