import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import "./Login.css";

type Props = {
  onSuccess?: () => void;
};

export default function Login({ onSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    if (auth.user && onSuccess) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const ok = await auth.login(username, password);
    if (!ok) setError("Usuari o contrasenya incorrectes");
    setSubmitting(false);
    // AppContent reacciona a auth.user
  };

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div className="login-badge">Accés restringit</div>
        <h1>Accés administrador</h1>
        <p>
          Inicia sessió només si estàs autoritzat per gestionar datasets i configuracions. Les accions
          queden registrades per motius d'auditoria.
        </p>
        <div className="login-highlights">
          <span>Gestió de datasets</span>
          <span>Control de configuració</span>
          <span>Entorn segur</span>
        </div>
      </div>

      <div className="login-card">
        <div className="login-card__head">
          <h2>Entra a la consola</h2>
          <p>Accés per personal autoritzat. Si tens dubtes, contacta amb l'equip de dades.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Usuari</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="usuari@racc"
              autoComplete="username"
              required
            />
          </label>

          <label className="login-field">
            <span>Contrasenya</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? "Validant..." : "Entrar"}
          </button>
        </form>

        <div className="login-footnote">
          No veus les credencials? Escriu a l'equip responsable per obtenir-hi accés.
        </div>
      </div>
    </div>
  );
}