import { useState, type FormEvent } from "react";
import "./Auth.css";

type LoginProps = {
    onLogin: (username: string, userId: number, role: string) => void;
};

function Login({ onLogin }: LoginProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const response = await fetch(
            "http://127.0.0.1:3000/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.log("Ошибка:", data);
            return;
        }

        localStorage.setItem("token", data.token);

        onLogin(data.username, data.user_id, data.role);
    }

    return (
        <form className="auth-card" onSubmit={handleSubmit}>
            <div className="auth-eyebrow">TASK MANAGER</div>
            <h1 className="auth-title">С возвращением</h1>
            <p className="auth-subtitle">Войдите, чтобы продолжить работу с задачами.</p>

            <div className="auth-field">
                <label htmlFor="login-username">Имя пользователя</label>

                <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(event) =>
                        setUsername(event.target.value)
                    }
                    autoComplete="username"
                />
            </div>

            <div className="auth-field">
                <label htmlFor="login-password">Пароль</label>

                <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                        setPassword(event.target.value)
                    }
                    autoComplete="current-password"
                />
            </div>

            <button className="auth-submit" type="submit">Войти в аккаунт</button>
        </form>
    );
}

export default Login;