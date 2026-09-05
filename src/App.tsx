import { useState } from "react";
import Login from "./tools/Login";
import Register from "./tools/Register";
import Tasks from "./tools/Tasks";
import Profile from "./tools/Profile";
import "./App.css";

type Page = "profile" | "tasks";

function App() {
    const [authPage, setAuthPage] = useState<"login" | "register">(
        localStorage.getItem("token") ? "login" : "login"
    );

    const [page, setPage] = useState<Page>("profile");

    const [isLoggedIn, setIsLoggedIn] = useState(
        Boolean(localStorage.getItem("token"))
    );

    function handleLogin(username: string, userId: number, role: string) {
        localStorage.setItem("username", username);
        localStorage.setItem("user_id", String(userId));
        localStorage.setItem("role", role);
        setIsLoggedIn(true);
        setPage("profile");
    }

    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("user_id");
        localStorage.removeItem("role");
        setIsLoggedIn(false);
        setAuthPage("login");
    }

    if (!isLoggedIn) {
        return (
            <div className="auth-page">
                {authPage === "login" && (
                    <>
                        <Login onLogin={handleLogin} />

                        <button
                            className="auth-switch"
                            onClick={() =>
                                setAuthPage("register")
                            }
                        >
                            Регистрация
                        </button>
                    </>
                )}

                {authPage === "register" && (
                    <>
                        <Register />

                        <button
                            className="auth-switch"
                            onClick={() =>
                                setAuthPage("login")
                            }
                        >
                            Назад ко входу
                        </button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <h2 className="sidebar-title">
                    Task Manager
                </h2>

                <nav className="sidebar-nav">
                    <button
                        className={
                            page === "profile"
                                ? "sidebar-button active"
                                : "sidebar-button"
                        }
                        onClick={() => setPage("profile")}
                    >
                        Профиль
                    </button>

                    <button
                        className={
                            page === "tasks"
                                ? "sidebar-button active"
                                : "sidebar-button"
                        }
                        onClick={() => setPage("tasks")}
                    >
                        Задачи
                    </button>
                </nav>

                <button
                    className="sidebar-logout"
                    onClick={handleLogout}
                >
                    Выйти
                </button>
            </aside>

            <main className="main-content">
                {page === "profile" && <Profile />}

                {page === "tasks" && <Tasks onLogout={handleLogout} />}
            </main>
        </div>
    );
}

export default App;