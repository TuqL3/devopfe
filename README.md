# Todo frontend

Repo độc lập `fe`: React + TypeScript strict + Vite. Backend Express/Prisma nằm trong repo độc lập `be`.
Mỗi repo có dependencies, lockfile, Git và lệnh chạy riêng; không dùng npm workspaces hoặc package dùng chung.

## Chạy development

Yêu cầu Node.js nhánh 22 từ 22.12 trở lên, hoặc Node.js 24 trở lên; npm 10+.
Chạy các lệnh sau từ thư mục `fe`:

```sh
npm ci
npm run dev
```

Mở `http://localhost:5173`. Chạy backend ở terminal riêng, từ thư mục repo `be`:

```sh
npm ci
cp .env.example .env
# Điền DATABASE_URL trong .env và chuẩn bị PostgreSQL theo README của be.
npm run db:generate
npm run db:migrate:deploy
npm run dev
```

Nếu `.env` của backend đã tồn tại thì sửa file đó, không ghi đè bằng lệnh `cp`.

Frontend gọi `/api` cùng origin. Khi development, Vite chuyển tiếp `/api` tới backend mặc định ở `http://127.0.0.1:3000`, tương ứng với backend lắng nghe IPv4 `0.0.0.0`.
Để đổi địa chỉ backend development, tạo `.env` trong repo `fe` từ `.env.example`:

```dotenv
API_PROXY_TARGET=http://127.0.0.1:3000
```

Biến này chỉ được đọc bởi Vite dev/preview, không đưa vào bundle trình duyệt. Khởi động lại Vite sau khi sửa.
Không đặt secrets vào `VITE_*`. Frontend không cần biến môi trường runtime với mô hình `/api` cùng origin.
Khi triển khai, bạn phục vụ `dist` và định tuyến `/api` tới backend cùng origin; đổi backend qua định tuyến sẽ không cần build lại frontend.
Repo không chứa cấu hình reverse proxy, Dockerfile hoặc hạ tầng triển khai.

## Chức năng

- Danh sách Todo và trạng thái tải, danh sách rỗng, lỗi và nút thử lại.
- Xem chi tiết bằng endpoint `GET /api/todos/:id`.
- Tạo/sửa tiêu đề và mô tả; hiển thị lỗi validation của backend, giữ bản nháp khi lưu thất bại.
- Đánh dấu hoàn thành/chưa hoàn thành; chờ backend xác nhận trước khi cập nhật giao diện.
- Xóa sau khi người dùng xác nhận; giữ công việc nếu request thất bại.
- Khóa thao tác trùng khi đang gửi request; bỏ qua response chi tiết cũ khi chuyển lựa chọn.
- Giao diện responsive, HTML labels, thông báo `status`/`alert`, focus bàn phím và reduced motion.

## Kiểm thử và build

```sh
npm test
npm run lint
npm run type-check
npm run build
npm run preview
```

Tests dùng Vitest + React Testing Library + jsdom, mock API/fetch; không cần PostgreSQL.
Kiểm tra API client, CRUD trên UI, validation, lỗi mạng/proxy, retry, request đang chờ và response cũ.
Type-check bao gồm source, tests và cấu hình. Build tạo static assets trong `dist/`.
Preview ở `http://localhost:4173` phục vụ bản build và dùng cùng proxy development; đây là công cụ kiểm tra local.
Vite dùng strict port: nếu 5173 hoặc 4173 đã có tiến trình sử dụng, lệnh dừng để bạn xử lý thay vì tự đổi cổng.

## Cấu trúc

```text
src/
  App.tsx              # Điều phối state, loading/error và CRUD
  api.ts               # fetch /api, lỗi HTTP và lỗi kết nối
  types.ts             # Todo DTO, request types
  components/
    TodoList.tsx
    TodoDetail.tsx
    TodoForm.tsx
  styles.css
tests/
```

Chưa xác minh luồng trình duyệt → backend → PostgreSQL thật; việc này cần database do bạn chuẩn bị và thuộc Phase 4.
ESLint 9 được giữ để tương thích Node 22.12, npm có cảnh báo nhánh này đã hết hỗ trợ.

Tham khảo: [Vite server options](https://vite.dev/config/server-options), [React useEffect và xử lý response cũ](https://react.dev/reference/react/useEffect).

## Kết quả Phase 3

- `npm install`: thành công, npm audit báo 0 vulnerabilities tại thời điểm cài.
- `npm test`: 17 tests pass.
- `npm run lint`, `npm run type-check`, `npm run build`: thành công.
- Đã khởi chạy Vite và mở bằng Chrome headless để kiểm tra giao diện trên trình duyệt.
- Chưa xác minh CRUD với backend/PostgreSQL thật. Nếu cổng 3000 đang được ứng dụng khác sử dụng, chọn cổng khác cho `PORT` của backend và đặt `API_PROXY_TARGET` tương ứng trong `.env` của frontend, rồi restart Vite.
