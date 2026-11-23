# Security Patch Log

**Ecosystem:** Go-Seek Hardware Diagnostic Application & Distributed Microservices  
**Date:** November 23, 2026  
**Change Category:** Defense-in-Depth Security Hardening  

---

## Modified & Created Files Summary

### 1. Frontend: `Go-Seek`
- **`Go-Seek/.env`**: Added `GENERATE_SOURCEMAP=false` and `DISABLE_ESLINT_PLUGIN=true` to eliminate source code exposure.
- **`Go-Seek/src/services/authStore.js`**: Created centralized in-memory reactive authentication module with token/user state management and observer subscriptions, completely replacing `localStorage`.
- **`Go-Seek/src/components/AuthModal.jsx`**: Refactored login and registration to dispatch authentication credentials through `authStore.setAuth()`.
- **`Go-Seek/src/components/TicketModal.jsx`**: Integrated active token visual badge under "Raise Issue", enabling copy/mask actions and automated `Authorization: Bearer <token>` attachment.
- **`Go-Seek/src/App.js`**: Updated global context to consume in-memory `authStore`.
- **`Go-Seek/src/components/ComputeDashboard.js`**: Enhanced CPU waveform display with toggle between Task Manager utilization % and dynamic clock speed reflecting Windows Turbo Boost.
- **`Go-Seek/electron/menus/board.cjs`**: Removed Linux-specific fallbacks on Windows, displaying true Windows 11 platform chipset, bridges, and UEFI information.

### 2. Microservice: `auth-service`
- **`auth-service/src/main/resources/application.properties`**: Tightened CORS origins (removed wildcard), externalized internal secret key, disabled stack traces in errors.
- **`auth-service/src/main/java/com/srikanth/auth/security/RateLimitingFilter.java`**: Implemented sliding-window rate limiter protecting login and registration.
- **`auth-service/src/main/java/com/srikanth/auth/security/JwtService.java`**: Added token revocation blacklist, unique `jti`, issuer, and audience validation.
- **`auth-service/src/main/java/com/srikanth/auth/security/JwtAuthenticationFilter.java`**: Integrated token revocation verification on every request.
- **`auth-service/src/main/java/com/srikanth/auth/config/SecurityConfig.java`**: Registered `RateLimitingFilter`, configured CSP/HSTS/Frame-Options security headers, secured internal routes.
- **`auth-service/src/main/java/com/srikanth/auth/controller/AuthController.java`**: Added `/logout` token invalidation, `/mfa/verify` TOTP verification, and protected `/internal/users/{email}` with `X-Internal-Service-Key`.
- **`auth-service/src/main/java/com/srikanth/auth/exception/GlobalExceptionHandler.java`**: Sanitized error responses to prevent database/stack trace leaks.

### 3. Microservice: `go-seek-backend`
- **`go-seek-backend/src/main/resources/application.properties`**: Removed CORS wildcard `*`, configured internal service key, disabled error message leaks.
- **`go-seek-backend/src/main/java/com/example/taskmanager/security/RateLimitingFilter.java`**: Created sliding-window limiter for sensitive POST endpoints.
- **`go-seek-backend/src/main/java/com/example/taskmanager/security/WebhookSecurityService.java`**: Implemented constant-time HMAC-SHA256 signature verification.
- **`go-seek-backend/src/main/java/com/example/taskmanager/security/JwtAuthenticationFilter.java`**: Enforced role-based access control (`ROLE_ADMIN` vs `ROLE_USER`).
- **`go-seek-backend/src/main/java/com/example/taskmanager/config/SecurityConfig.java`**: Secured protected endpoints, registered rate limiter, added security headers, tightened CORS.
- **`go-seek-backend/src/main/java/com/example/taskmanager/controller/ResumeController.java`**: Hardened upload against path traversal, magic byte spoofing, 5MB cap, and added authentication requirement.
- **`go-seek-backend/src/main/java/com/example/taskmanager/service/ResumeService.java`**: Implemented `isSafeRemoteUrl` blocking loopback, link-local, and private IP blocks (SSRF defense).
- **`go-seek-backend/src/main/java/com/example/taskmanager/controller/TicketController.java` & `TicketService.java`**: Remediated BOLA/IDOR by filtering tickets by authenticated user email and verifying ownership on status updates.
- **`go-seek-backend/src/main/java/com/example/taskmanager/controller/ContactController.java`**: Protected contact messages listing with `hasRole('ADMIN')`.
- **`go-seek-backend/src/main/java/com/example/taskmanager/client/AuthServiceClient.java`**: Passed `X-Internal-Service-Key` header.

### 4. Frontend: `srikanthy`
- **`srikanthy/vite.config.js`**: Set `build: { sourcemap: false }` to prevent production source map generation.
