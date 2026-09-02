import { useState, type FormEvent } from "react";

type LoginProps = {
    onLogin: () => void;
};

function Login({ onLogin }: LoginProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const user = {
            username,
            password
        };

        try {
            const response = await fetch("http://127.0.0.1:3000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(user)
            });

            const data = await response.json();

            if (!response.ok) {
                console.log("Ошибка:", data);
                return;
            }

            localStorage.setItem("token", data.token);

            onLogin();

        } catch (error) {
            console.error("Ошибка соединения:", error);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>Login</h2>

            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
            />

            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
            />

            <button type="submit">
                Login
            </button>
        </form>
    );
}

export default Login;