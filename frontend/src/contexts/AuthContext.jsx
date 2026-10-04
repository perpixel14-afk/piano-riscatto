import { createContext, useContext, useState } from 'react';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  // BYPASS TOTALE: Forziamo un utente amministratore fittizio sempre attivo
  const [user, setUser] = useState({
    id: 1,
    name: 'Admin Piano Riscatto',
    email: 'perpixel14@gmail.com',
    role: 'admin'
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    const fakeUser = {
      id: 1,
      name: 'Admin Piano Riscatto',
      email: email || 'perpixel14@gmail.com',
      role: 'admin'
    };
    setUser(fakeUser);
    return fakeUser;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, setUser, isAdmin: true }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);