import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import "./Tasks.css";

type Task = {
    id: number;
    user_id: number;
    assignee_id: number | null;
    assignee_username: string | null;
    assignee_avatar_url: string | null;
    title: string;
    description: string | null;
    completed: boolean;
    due_date: string | null;
    proof_url: string | null;
    review_status: "none" | "pending" | "approved" | "rejected";
};

type User = {
    id: number;
    username: string;
    role: string;
};

type TasksProps = {
    onLogout: () => void;
};

type TaskFilter = "all" | "mine" | "assigned" | "active" | "completed";

function Tasks({ onLogout }: TasksProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [assigneeId, setAssigneeId] = useState("");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [filter, setFilter] = useState<TaskFilter>("all");

    const currentUserId = Number(localStorage.getItem("user_id"));
    const canCreateTasks = ["manager", "admin"].includes(
        localStorage.getItem("role") || ""
    );
    const canManageAllTasks = localStorage.getItem("role") === "admin";
    const canReviewTasks = ["manager", "admin"].includes(
        localStorage.getItem("role") || ""
    );
    const filteredTasks = tasks.filter((task) => {
        if (filter === "mine") {
            return task.user_id === currentUserId;
        }

        if (filter === "assigned") {
            return task.assignee_id === currentUserId;
        }

        if (filter === "active") {
            return !task.completed;
        }

        if (filter === "completed") {
            return task.completed;
        }

        return true;
    });

    async function loadTasks() {
        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        const response = await fetch(
            "http://127.0.0.1:3000/tasks",
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            const text = await response.text();
            console.log("Ошибка:", text);
            return;
        }

        const data = await response.json();

        setTasks(data);
    }

    useEffect(() => {
        loadTasks();
        loadUsers();
    }, []);

    async function loadUsers() {
        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        const response = await fetch("http://127.0.0.1:3000/users", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
            setUsers(await response.json());
        }
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        if (!title.trim()) {
            return;
        }

        const response = await fetch(
            "http://127.0.0.1:3000/tasks",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    due_date: dueDate || null,
                    assignee_id: assigneeId ? Number(assigneeId) : null
                })
            }
        );

        if (!response.ok) {
            const text = await response.text();
            console.log("Ошибка:", text);
            return;
        }

        setTitle("");
        setDescription("");
        setDueDate("");
        setAssigneeId("");

        loadTasks();
    }

    async function toggleTask(task: Task) {
        const input = document.getElementById(
            `proof-input-${task.id}`
        ) as HTMLInputElement | null;

        input?.click();
    }

    async function submitProof(task: Task, event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        const token = localStorage.getItem("token");

        if (!file || !token || !file.type.startsWith("image/")) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const response = await fetch(
                `http://127.0.0.1:3000/tasks/${task.id}/proof`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ proof_url: String(reader.result) })
                }
            );

            if (!response.ok) {
                console.log("Ошибка:", await response.text());
                return;
            }

            loadTasks();
        };
        reader.readAsDataURL(file);
        event.target.value = "";
    }

    async function reviewTask(task: Task, approved: boolean) {
        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        const response = await fetch(`http://127.0.0.1:3000/tasks/${task.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ approved })
        });

        if (response.ok) {
            loadTasks();
        }
    }

    async function deleteTask(id: number) {
        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        const response = await fetch(
            `http://127.0.0.1:3000/tasks/${id}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            const text = await response.text();
            console.log("Ошибка:", text);
            return;
        }

        loadTasks();
    }

    return (
        <div className="tasks-page">
            <div className="tasks-container">
                <div className="tasks-header">
                    <h1 className="tasks-title">
                        Мои задачи
                    </h1>

                    <button
                        className="logout-button"
                        onClick={onLogout}
                    >
                        Выйти
                    </button>
                </div>

                {canCreateTasks && <form
                    className="task-form"
                    onSubmit={handleSubmit}
                >
                    <input
                        className="task-input"
                        type="text"
                        placeholder="Название задачи"
                        value={title}
                        onChange={(event) =>
                            setTitle(event.target.value)
                        }
                    />

                    <textarea
                        className="task-textarea"
                        placeholder="Описание"
                        value={description}
                        onChange={(event) =>
                            setDescription(event.target.value)
                        }
                    />

                    <div className="task-form-row">
                        <input
                            className="task-input"
                            type="date"
                            value={dueDate}
                            onChange={(event) => setDueDate(event.target.value)}
                        />

                        <select
                            className="task-input"
                            value={assigneeId}
                            onChange={(event) => setAssigneeId(event.target.value)}
                        >
                            <option value="">Без исполнителя</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.username} ({user.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        className="create-button"
                        type="submit"
                    >
                        Создать задачу
                    </button>
                </form>}

                <h2 className="tasks-subtitle">
                    Список задач
                </h2>

                <div className="task-filter">
                    <label htmlFor="task-filter-select">Показать:</label>
                    <select
                        id="task-filter-select"
                        value={filter}
                        onChange={(event) =>
                            setFilter(event.target.value as TaskFilter)
                        }
                    >
                        <option value="all">Все задачи</option>
                        <option value="mine">Мои задачи</option>
                        <option value="assigned">Назначенные мне</option>
                        <option value="active">Активные</option>
                        <option value="completed">Выполненные</option>
                    </select>
                </div>

                {filteredTasks.length === 0 ? (
                    <p className="no-tasks">
                        {tasks.length === 0
                            ? "Задач пока нет"
                            : "По этому фильтру задач нет"}
                    </p>
                ) : (
                    filteredTasks.map((task) => (
                        <div
                            className={`task-card ${
                                task.completed
                                    ? "completed"
                                    : ""
                            }`}
                            key={task.id}
                        >
                            <h3>{task.title}</h3>

                            <p className="task-description">
                                {task.description ||
                                    "Без описания"}
                            </p>

                            <p className="task-status">
                                Статус:{" "}
                                {task.completed ? "Выполнено" :
                                    task.review_status === "pending" ? "На проверке" :
                                    task.review_status === "rejected" ? "Отклонено" : "Активна"}
                            </p>

                            <p className="task-status">
                                Срок: {task.due_date || "Не указан"}
                            </p>

                            <div className="task-assignee">
                                <span>Исполнитель:</span>
                                {task.assignee_username ? (
                                    <span className="assignee-user">
                                        {task.assignee_avatar_url ? (
                                            <img
                                                className="assignee-avatar"
                                                src={task.assignee_avatar_url}
                                                alt=""
                                            />
                                        ) : (
                                            <span className="assignee-avatar assignee-avatar-placeholder">
                                                {task.assignee_username.slice(0, 1).toUpperCase()}
                                            </span>
                                        )}
                                        {task.assignee_username}
                                    </span>
                                ) : (
                                    <span>Не назначен</span>
                                )}
                            </div>

                            {task.proof_url && (
                                <img
                                    className="task-proof"
                                    src={task.proof_url}
                                    alt="Доказательство выполнения"
                                />
                            )}

                            {canReviewTasks && task.review_status === "pending" && (
                                <div className="task-actions">
                                    <button
                                        className="task-button complete-button"
                                        onClick={() => reviewTask(task, true)}
                                    >
                                        Подтвердить
                                    </button>
                                    <button
                                        className="task-button delete-button"
                                        onClick={() => reviewTask(task, false)}
                                    >
                                        Отклонить
                                    </button>
                                </div>
                            )}

                            <div className="task-actions">
                                {!task.completed &&
                                    task.review_status !== "pending" &&
                                    (task.user_id === currentUserId || task.assignee_id === currentUserId) && (
                                        <>
                                            <button
                                                className="task-button complete-button"
                                                onClick={() => toggleTask(task)}
                                            >
                                                Приложить фото и отправить
                                            </button>
                                            <input
                                                id={`proof-input-${task.id}`}
                                                className="proof-input"
                                                type="file"
                                                accept="image/*"
                                                onChange={(event) => submitProof(task, event)}
                                            />
                                        </>
                                    )}

                                {(canManageAllTasks || task.user_id === currentUserId) && (
                                    <button
                                        className="task-button delete-button"
                                        onClick={() => deleteTask(task.id)}
                                    >
                                        Удалить
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Tasks;