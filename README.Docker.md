# Frontend Docker

## Development

Chạy backend trước, rồi chạy từ repo `fe`:

```sh
docker compose up -d --build
curl --fail http://localhost:5173/api/health/ready
```

Compose chọn target `development`, Vite ở cổng `5173` và proxy qua
`host.docker.internal:3000` trên Docker Desktop.

## Production image

```sh
docker build --target production -t todo-frontend .
```

Runtime dùng Nginx unprivileged, chạy nonroot và nghe cổng `8080`.
Image có healthcheck HTTP cho frontend. Nginx phục vụ static assets và chuyển
`/api` tới `backend:3000`; backend phải nằm cùng network với alias `backend`
và sẵn sàng trước khi frontend khởi động. Không dùng `API_PROXY_TARGET` cho
production vì biến đó chỉ cấu hình Vite dev/preview.

Frontend CI kiểm tra lint, type-check, tests và build. Chỉ push vào `develop`
đã pass job `verify` mới publish:

- `ghcr.io/tuql3/devopfe:<full-commit-sha>`: phiên bản để release/rollback.
- `ghcr.io/tuql3/devopfe:develop`: tag tiện dụng có thể thay đổi.

## Release và rollback cùng backend

Repo backend chứa `compose.release.yaml`, `release.env.example` và hướng dẫn
trong `README.Docker.md`. File release ghi cả SHA frontend/backend và giữ cặp
trước đó trong `previous.env`. Dùng lại image từ GHCR, không build lại khi deploy.

Image frontend cũ trước thay đổi nonroot nghe cổng `80`; lưu
`FRONTEND_CONTAINER_PORT=80` trong cấu hình release cũ để rollback đúng cổng.
Image mới dùng `FRONTEND_CONTAINER_PORT=8080`. Giữ ít nhất hai phiên bản SHA
trên GHCR và kiểm tra UI, API readiness, CRUD, SHA/digest sau rollback.
