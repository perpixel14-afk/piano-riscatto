# EDS PIXEL - Test Credentials

## Admin (Amministratore)
- Email: perpixel14@gmail.com
- Password: admin123
- Role: admin

## Tecnico
- Email: tecnico@edspixel.it
- Password: tecnico123
- Role: tecnico

## Auth endpoints
- POST /api/auth/login  { email, password } -> { token, user }
- GET  /api/auth/me     (Bearer token) -> user
- GET  /api/auth/users  (admin only)
- POST /api/auth/users  (admin only)

Token is a JWT returned by /api/auth/login and must be sent as `Authorization: Bearer <token>` for all authenticated endpoints.
