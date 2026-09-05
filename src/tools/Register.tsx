import { useState } from "react";
import "./Auth.css";

function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        console.log(username);
        console.log(password);

        const user = {
        username,
        password
    };

    const response = await fetch("http://127.0.0.1:3000/register", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(user)
    });

    console.log(response);
    }

    return (
        <form className="auth-card" onSubmit={handleSubmit}>
            <div className="auth-eyebrow">TASK MANAGER</div>
            <h1 className="auth-title">Создайте аккаунт</h1>
            <p className="auth-subtitle">Организуйте работу и держите задачи под контролем.</p>

            <div className="auth-field">
                <label htmlFor="register-username">Имя пользователя</label>
                <input
                    id="register-username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                />
            </div>

            <div className="auth-field">
                <label htmlFor="register-password">Пароль</label>
                <input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                />
            </div>

            <button className="auth-submit" type="submit">Зарегистрироваться</button>
        </form>
    );
}

export default Register;