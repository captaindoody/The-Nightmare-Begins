import Register from "./tools/Register";
import Login from "./tools/Login";
import Tasks from "./tools/Tasks";
import { useState } from "react";

function App() {
    const [page, setPage] = useState<"login" | "register" | "task">(
        localStorage.getItem("token") ? "task" : "login"
    );

    function handleLogin() {
        setPage("task");
    }

    function handleLogout() {
        localStorage.removeItem("token");
        setPage("login");
    }

    return (
        <div>
            {page === "login" && (
                <>
                    <Login onLogin={handleLogin} />

                    <button onClick={() => setPage("register")}>
                        Регистрация
                    </button>
                </>
            )}

            {page === "register" && (
                <>
                    <Register />

                    <button onClick={() => setPage("login")}>
                        Назад ко входу
                    </button>
                </>
            )}

            {page === "task" && (
                <Tasks onLogout={handleLogout} />
            )}
        </div>
    );
}

export default App;