use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, patch},
    Json,
    Router,
};

use jsonwebtoken::{
    decode,
    DecodingKey,
    Validation,
};

use serde::Deserialize;
use sqlx::query_as;

use crate::{
    models::{
        CreateTaskRequest,
        Task,
        UpdateTaskRequest,
    },
    AppState,
};

const TASK_SELECT: &str =
    "SELECT tasks.id, tasks.user_id, tasks.assignee_id,
            assignee.username AS assignee_username,
            assignee.avatar_url AS assignee_avatar_url,
            tasks.title, tasks.description, tasks.completed,
            tasks.due_date, tasks.created_at
     FROM tasks
     LEFT JOIN users AS assignee ON assignee.id = tasks.assignee_id";

#[derive(Deserialize)]
struct Claims {
    sub: i32,
    exp: usize,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/tasks",
            get(get_tasks).post(create_task),
        )
        .route(
            "/tasks/{id}",
            patch(update_task).delete(delete_task),
        )
}

fn get_user_id(
    authorization: &str,
    secret: &str,
) -> Result<i32, (StatusCode, String)> {
    let token = authorization
        .strip_prefix("Bearer ")
        .ok_or((
            StatusCode::UNAUTHORIZED,
            "Invalid authorization header".to_string(),
        ))?;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| {
        (
            StatusCode::UNAUTHORIZED,
            "Invalid token".to_string(),
        )
    })?;

    Ok(token_data.claims.sub)
}

async fn get_tasks(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
) -> Result<Json<Vec<Task>>, (StatusCode, String)> {
    let authorization = headers
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or((
            StatusCode::UNAUTHORIZED,
            "Authorization required".to_string(),
        ))?;

    let user_id = get_user_id(
        authorization,
        &state.jwt_secret,
    )?;

    let tasks = query_as::<_, Task>(&format!(
        "{} WHERE tasks.user_id = $1 OR tasks.assignee_id = $1 ORDER BY tasks.id",
        TASK_SELECT
    ))
    .bind(user_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error.to_string(),
        )
    })?;

    Ok(Json(tasks))
}

async fn create_task(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Json(data): Json<CreateTaskRequest>,
) -> Result<Json<Task>, (StatusCode, String)> {
    let authorization = headers
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or((
            StatusCode::UNAUTHORIZED,
            "Authorization required".to_string(),
        ))?;

    let user_id = get_user_id(
        authorization,
        &state.jwt_secret,
    )?;

    let task = query_as::<_, Task>(
        "INSERT INTO tasks
         (user_id, assignee_id, title, description, due_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, assignee_id, NULL::TEXT AS assignee_username,
                   NULL::TEXT AS assignee_avatar_url,
                   title, description, completed, due_date, created_at"
    )
    .bind(user_id)
    .bind(data.assignee_id)
    .bind(data.title)
    .bind(data.description)
    .bind(data.due_date)
    .fetch_one(&state.pool)
    .await
    .map_err(|error| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error.to_string(),
        )
    })?;

    Ok(Json(task))
}

async fn update_task(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<i32>,
    Json(data): Json<UpdateTaskRequest>,
) -> Result<Json<Task>, (StatusCode, String)> {
    let authorization = headers
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or((
            StatusCode::UNAUTHORIZED,
            "Authorization required".to_string(),
        ))?;

    let user_id = get_user_id(
        authorization,
        &state.jwt_secret,
    )?;

    let task = query_as::<_, Task>(
                "UPDATE tasks
         SET completed = $1
         WHERE id = $2
                     AND (user_id = $3 OR assignee_id = $3)
                 RETURNING id, user_id, assignee_id, NULL::TEXT AS assignee_username,
                           NULL::TEXT AS assignee_avatar_url,
                                     title, description, completed, due_date, created_at"
    )
    .bind(data.completed)
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|error| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error.to_string(),
        )
    })?;

    match task {
        Some(task) => Ok(Json(task)),
        None => Err((
            StatusCode::NOT_FOUND,
            "Task not found".to_string(),
        )),
    }
}

async fn delete_task(
    State(state): State<AppState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<i32>,
) -> Result<StatusCode, (StatusCode, String)> {
    let authorization = headers
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or((
            StatusCode::UNAUTHORIZED,
            "Authorization required".to_string(),
        ))?;

    let user_id = get_user_id(
        authorization,
        &state.jwt_secret,
    )?;

    let result = sqlx::query(
        "DELETE FROM tasks
                 WHERE id = $1
                     AND user_id = $2"
    )
    .bind(id)
    .bind(user_id)
    .execute(&state.pool)
    .await
    .map_err(|error| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            error.to_string(),
        )
    })?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            "Task not found".to_string(),
        ));
    }

    Ok(StatusCode::NO_CONTENT)
}