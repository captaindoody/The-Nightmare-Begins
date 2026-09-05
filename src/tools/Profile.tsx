import { useEffect, useState, type ChangeEvent } from "react";
import "./Profile.css";

type User = {
    id: number;
    username: string;
    role: string;
};

function Profile() {
    const [username, setUsername] = useState(localStorage.getItem("username") || "");
    const [role, setRole] = useState("user");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    async function loadUsers(token: string) {
        const response = await fetch("http://127.0.0.1:3000/users", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
            setUsers(await response.json());
        }
    }

    useEffect(() => {
        async function loadProfile() {
            const token = localStorage.getItem("token");

            if (!token) {
                return;
            }

            const response = await fetch("http://127.0.0.1:3000/profile", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                return;
            }

            const profile = await response.json();
            setUsername(profile.username);
            setRole(profile.role);
            setAvatarUrl(profile.avatar_url);

            if (profile.role === "admin") {
                loadUsers(token);
            }
        }

        loadProfile();
    }, []);

    async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        const token = localStorage.getItem("token");

        if (!file || !token || !file.type.startsWith("image/")) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const nextAvatarUrl = String(reader.result);
            const response = await fetch("http://127.0.0.1:3000/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ avatar_url: nextAvatarUrl })
            });

            if (response.ok) {
                setAvatarUrl(nextAvatarUrl);
            }
        };
        reader.readAsDataURL(file);
    }

    async function handleRoleChange(userId: number, nextRole: string) {
        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        const response = await fetch(`http://127.0.0.1:3000/users/${userId}/role`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ role: nextRole })
        });

        if (response.ok) {
            setUsers((currentUsers) => currentUsers.map((user) =>
                user.id === userId ? { ...user, role: nextRole } : user
            ));
        }
    }

    return (
        <div className="profile-page">
            <h1>Профиль</h1>

            <div className="profile-info">
                <div className="profile-avatar-wrap">
                    {avatarUrl ? (
                        <img className="profile-avatar" src={avatarUrl} alt="Аватар" />
                    ) : (
                        <div className="profile-avatar profile-avatar-placeholder">
                            {username.slice(0, 1).toUpperCase() || "?"}
                        </div>
                    )}

                    <label className="avatar-upload-button">
                        Загрузить аватар
                        <input type="file" accept="image/*" onChange={handleAvatarChange} />
                    </label>
                </div>

                <p>
                    <strong>Имя пользователя:</strong> {username}
                </p>
                <p>
                    <strong>Роль:</strong> {role}
                </p>

                {role === "admin" && (
                    <div className="profile-admin">
                        <h2>Управление ролями</h2>
                        {users.map((user) => (
                            <div className="profile-user-row" key={user.id}>
                                <span>{user.username}</span>
                                <select
                                    value={user.role}
                                    onChange={(event) =>
                                        handleRoleChange(user.id, event.target.value)
                                    }
                                >
                                    <option value="user">Пользователь</option>
                                    <option value="manager">Менеджер</option>
                                    <option value="admin">Администратор</option>
                                </select>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Profile;