import { useEffect, useState, type FormEvent } from "react";
import "./Tasks.css";

type Task = {
    id: number;
    user_id: number;
    title: string;
    description: string | null;
    completed: boolean;
};

type TasksProps = {
    onLogout: () => void;
};

function Tasks({ onLogout }: TasksProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tasks, setTasks] = useState<Task[]>([]);

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
    }, []);

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
                    description
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

        loadTasks();
    }

    async function toggleTask(task: Task) {
        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        const response = await fetch(
            `http://127.0.0.1:3000/tasks/${task.id}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    completed: !task.completed
                })
            }
        );

        if (!response.ok) {
            const text = await response.text();
            console.log("Ошибка:", text);
            return;
        }

        loadTasks();
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

                <form
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

                    <button
                        className="create-button"
                        type="submit"
                    >
                        Создать задачу
                    </button>
                </form>

                <h2 className="tasks-subtitle">
                    Список задач
                </h2>

                {tasks.length === 0 ? (
                    <p className="no-tasks">
                        Задач пока нет
                    </p>
                ) : (
                    tasks.map((task) => (
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
                                {task.completed
                                    ? "Выполнено"
                                    : "Активна"}
                            </p>

                            <div className="task-actions">
                                <button
                                    className="task-button complete-button"
                                    onClick={() =>
                                        toggleTask(task)
                                    }
                                >
                                    {task.completed
                                        ? "Вернуть"
                                        : "Выполнить"}
                                </button>

                                <button
                                    className="task-button delete-button"
                                    onClick={() =>
                                        deleteTask(task.id)
                                    }
                                >
                                    Удалить
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Tasks;