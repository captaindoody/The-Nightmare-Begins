import { useState } from "react";

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
        <form onSubmit={handleSubmit}>
            Username

            <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
            />

            Password

            <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
            />

            <button type="submit">Register</button>
        </form>
    );
}

export default Register;