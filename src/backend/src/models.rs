use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user_id: i32,
    pub username: String,
    pub role: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct Profile {
    pub id: i32,
    pub username: String,
    pub role: String,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateProfileRequest {
    pub avatar_url: Option<String>,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct UserSummary {
    pub id: i32,
    pub username: String,
    pub role: String,
}

#[derive(Deserialize)]
pub struct UpdateRoleRequest {
    pub role: String,
}

#[derive(Deserialize)]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<chrono::NaiveDate>,
    pub assignee_id: Option<i32>,
}

#[derive(Deserialize)]
pub struct UpdateTaskRequest {
    pub completed: bool,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct Task {
    pub id: i32,
    pub user_id: i32,
    pub assignee_id: Option<i32>,
    pub assignee_username: Option<String>,
    pub assignee_avatar_url: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub completed: bool,
    pub due_date: Option<chrono::NaiveDate>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}