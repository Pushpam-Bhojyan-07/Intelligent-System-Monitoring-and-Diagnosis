import React, { useState } from "react";

function NLPAssistant() {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    const sendMessage = async (e) => {
        e.preventDefault();

        if (!message.trim() || loading) {
            return;
        }

        const userMessage = message.trim();

        setMessages((prev) => [
            ...prev,
            {
                role: "user",
                content: userMessage
            }
        ]);

        setMessage("");
        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:8000/api/nlp/chat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: userMessage
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Something went wrong.");
            }

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: result.answer,
                    intent: result.intent,
                    intentProvider: result.intent_provider,
                    responseProvider: result.response_provider,
                    data: result.data
                }
            ]);

        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: error.message,
                    error: true
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="nlp-page">
            <div className="nlp-header">
                <div>
                    <h2>SysGuard AI Assistant</h2>
                    <p>
                        Ask questions about your operating system
                        and database performance.
                    </p>
                </div>

                <span className="nlp-status">AI Powered</span>
            </div>

            <div className="nlp-chat-container">
                <div className="nlp-messages">

                    {messages.length === 0 && (
                        <div className="nlp-welcome">
                            <h3>How can I help you?</h3>
                            <p>
                                Ask me about your system's CPU,
                                memory usage, or running processes.
                            </p>

                            <div className="nlp-suggestions">
                                <button
                                    onClick={() =>
                                        setMessage(
                                            "What is my current CPU and memory usage?"
                                        )
                                    }
                                >
                                    Current CPU and memory usage
                                </button>

                                <button
                                    onClick={() =>
                                        setMessage(
                                            "Which process is consuming the most memory?"
                                        )
                                    }
                                >
                                    Highest memory-consuming process
                                </button>

                                <button
                                    onClick={() =>
                                        setMessage(
                                            "Which processes are consuming the highest CPU?"
                                        )
                                    }
                                >
                                    Top CPU-consuming processes
                                </button>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`nlp-message ${msg.role}`}
                        >
                            <div className="nlp-message-label">
                                {msg.role === "user" ? "You" : "SysGuard"}
                            </div>

                            <div className="nlp-message-content">
                                {msg.content.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                                    if (part.startsWith("**") && part.endsWith("**")) {
                                        return <strong key={i}>{part.slice(2, -2)}</strong>;
                                    }

                                    return <span key={i}>{part}</span>;
                                })}
                            </div>

                            {msg.role === "assistant" && !msg.error && (
                                <div className="nlp-message-meta">
                                    <span>Intent: {msg.intent}</span>
                                    <span>
                                        Intent AI: {msg.intentProvider}
                                    </span>
                                    <span>
                                        Response AI: {msg.responseProvider}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div className="nlp-loading">
                            SysGuard is analyzing your question...
                        </div>
                    )}

                </div>

                <form
                    className="nlp-input-area"
                    onSubmit={sendMessage}
                >
                    <input
                        type="text"
                        placeholder="Ask SysGuard something..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={loading}
                    />

                    <button
                        type="submit"
                        disabled={loading || !message.trim()}
                    >
                        {loading ? "..." : "Send"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default NLPAssistant;