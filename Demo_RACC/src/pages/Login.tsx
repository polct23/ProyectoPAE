import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

type Props = {
  onSuccess?: () => void;
};

export default function Login({ onSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const auth = useAuth();

  useEffect(() => {
    if (auth.user && onSuccess) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ok = await auth.login(username, password);
    if (!ok) setError("Usuario o contraseña incorrectos");
    // no useNavigate() aquí — AppContent reacciona a auth.user
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuario" />
        </div>
        <div style={{ marginTop: 8 }}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
        </div>
        <div style={{ marginTop: 12 }}>
          <button type="submit">Entrar</button>
        </div>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}