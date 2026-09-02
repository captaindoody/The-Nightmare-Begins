use axum::{
    extract::State,
    http::StatusCode,
    routing::post,
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
        RegisterRequest,
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
}

async fn register(
    State(state): State<AppState>,
    Json(data): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {

    let password_hash =
        hash_password(&data.password)?;

    let user = query_as::<_, (i32, String)>(
        "INSERT INTO users (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username"
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
    }))
}

async fn login(
    State(state): State<AppState>,
    Json(data): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {

    let user = query_as::<_, (i32, String, String)>(
        "SELECT id, username, password_hash
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

    let Some((id, username, password_hash)) = user else {
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
    }))
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