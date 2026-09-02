mod auth;
mod models;
mod tasks;

use axum::{
    http::{
        header::{AUTHORIZATION, CONTENT_TYPE, HeaderValue},
        Method,
    },
    Router,
};
use sqlx::PgPool;
use std::env;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub jwt_secret: String,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let database_url =
        env::var("DATABASE_URL")
            .expect("DATABASE_URL is not set");

    let jwt_secret =
        env::var("JWT_SECRET")
            .expect("JWT_SECRET is not set");

    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    let state = AppState {
        pool,
        jwt_secret,
    };

    let cors = CorsLayer::new()
        .allow_origin(
            HeaderValue::from_static("http://localhost:5173")
        )
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            AUTHORIZATION,
            CONTENT_TYPE,
        ]);

    let app = Router::new()
        .merge(auth::router())
        .merge(tasks::router())
        .layer(cors)
        .with_state(state);

    let listener =
        tokio::net::TcpListener::bind("127.0.0.1:3000")
            .await
            .expect("Failed to bind server");

    println!("Server: http://127.0.0.1:3000");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}