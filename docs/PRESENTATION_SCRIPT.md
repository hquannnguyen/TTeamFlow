# Script thuyết trình báo cáo bài tập lớn — TTeamFlow

> Đối chiếu với bộ slide: `Docker Compose 3 container (frontend + Nginx, backend, PostgreSQL).pptx` (23 slide)
> Thời lượng dự kiến: **15 phút thuyết trình + 5–7 phút demo trực tiếp + Q&A**
> Người trình bày có thể chia phần theo slide nhóm: 1–4 (nhóm trưởng), 5–11 (backend), 12–13 + demo (frontend), 20–23 (kết luận).

---

## Slide 1 — Trang bìa (≈30 giây)

**Nói:**

Kính chào thầy/cô và các bạn. Chúng em là nhóm phát triển TTeamFlow. Sản phẩm chúng em trình bày hôm nay là **hệ thống quản lý dự án nhóm trực quan theo mô hình Kanban** — một ứng dụng web fullstack được xây dựng bằng React, NestJS, Prisma và PostgreSQL, và được đóng gói **triển khai hoàn chỉnh bằng Docker Compose với 3 container: frontend kèm Nginx, backend và PostgreSQL**.

Trong khoảng 15 phút tới, chúng em sẽ đi qua: lý do ra đời của sản phẩm, kiến trúc và công nghệ, thiết kế cơ sở dữ liệu, cách chúng em xây dựng backend và frontend, sau đó là phần demo trực tiếp trên sản phẩm đang chạy bằng Docker.

---

## Slide 2 — Vì sao cần TTeamFlow? (≈45 giây)

**Nói:**

Chúng em xuất phát từ một vấn đề rất thật mà chính nhóm chúng em đã gặp phải khi làm việc với nhau. Đó là năm điểm:

**Thứ nhất, thông tin phân mảnh** — yêu cầu nằm ở chat, tiến độ nằm ở bảng tính, tài liệu nằm ở ổ đĩa, muốn tìm một quyết định phải lục lại ba nơi.

**Thứ hai, quên hạn chót** — vì không có một nơi nào cảnh báo tập trung.

**Thứ ba, khó cân bằng khối lượng** — người quản lý không biết ai đang quá tải, ai còn rảnh, nên việc giao việc rất cảm tính.

**Thứ tư, cập nhật tiến độ thủ công** — nhóm phải dành thời gian họp chỉ để báo cáo cho nhau những thứ mà hệ thống hoàn toàn có thể tự ghi lại.

**Và thứ năm, phân quyền lỏng lẻo** — ai cũng sửa được mọi thứ, sửa nhầm thì mất, không có lịch sử thay đổi.

Từ đó, TTeamFlow hướng đến mục tiêu: **một nền tảng duy nhất cho cả vòng đời dự án** — dữ liệu tập trung, bảng Kanban kéo thả trực quan, cảnh báo hạn chót, thống kê khối lượng từng người, phân quyền hai tầng và nhật ký đầy đủ mọi thao tác.

---

## Slide 3 — Phạm vi chức năng (≈45 giây)

**Nói:**

Đây là toàn bộ 9 nhóm chức năng chúng em đã hoàn thành. Em xin liệt kê nhanh:

1. **Xác thực**: đăng ký, đăng nhập, đổi mật khẩu.
2. **Dự án và thành viên**: tạo dự án, lưu trữ, mời thành viên, đổi vai trò.
3. **Bảng Kanban**: cột tùy chỉnh theo ý người dùng, kéo thả task giữa các cột.
4. **Công việc**: ưu tiên, hạn chót, và một task có thể gán cho **nhiều người** thực hiện.
5. **Checklist và bình luận**: nhiệm vụ phụ bên trong task, bình luận có thể nhắc tên bằng dấu @ để gửi thông báo.
6. **Tổng quan**: tiến độ, khối lượng từng thành viên, xuất báo cáo CSV.
7. **Nhật ký hoạt động**: ghi lại mọi thao tác quan trọng, không được phép sửa hay xóa.
8. **Thông báo**: khi giao việc, khi bị nhắc tên, khi task đổi trạng thái.
9. **Quản trị và phân quyền hai tầng**, kèm khả năng khóa tài khoản.

Nói cách khác, sản phẩm không dừng ở "vẽ được bảng Kanban", mà bao phủ trọn vẹn vòng đời quản trị một dự án nhóm.

---

## Slide 4 — Kiến trúc tổng thể (≈1 phút)

**Nói:**

Đây là slide quan trọng để hiểu toàn bộ hệ thống, và cũng là chủ đề chính trong tên bài nộp của chúng em: **Docker Compose với 3 container**.

M luồng dữ liệu đi như sau: **Trình duyệt chỉ nói chuyện với đúng một cổng vào là Nginx ở cổng 80**. Khi người dùng mở trang web, Nginx trả về **React SPA**. Khi ứng dụng gọi API với tiền tố `/api/*`, Nginx **proxy ngược** sang **NestJS ở cổng 3000**. Backend thao tác với dữ liệu qua **Prisma ORM** — giúp mọi truy vấn đều an toàn về kiểu — và lưu vào **PostgreSQL ở cổng 5432**.

Ba container này được mô tả trong `docker-compose.yml`:

- **Container frontend**: image Nginx, vừa phục vụ file tĩnh của React, vừa làm reverse proxy — người dùng không bao giờ truy cập trực tiếp backend.
- **Container backend**: chỉ `expose` cổng 3000 trong mạng nội bộ của Docker, **không publish ra ngoài**, và chỉ khởi động sau khi PostgreSQL **healthcheck** xong nhờ `depends_on` với điều kiện `service_healthy`.
- **Container PostgreSQL**: dữ liệu lưu trong **volume** `postgres_data` nên xoá container không mất dữ liệu; cổng chỉ gắn vào `127.0.0.1` để không lộ ra mạng ngoài.

Một chi tiết đáng chú ý: trong Docker, backend kết nối database bằng hostname `postgres` — chính là tên service — chứ không phải `localhost`, vì mỗi container là một máy riêng trong mạng Docker.

Về giao thức: toàn bộ là **REST + JSON** với tiền tố `/api/v1`; phiên làm việc dùng **JWT hai token** đặt trong cookie **HttpOnly**; dữ liệu quản lý bằng **migration có lịch sử** và áp dụng **soft delete**.

---

## Slide 5 — Công nghệ sử dụng (≈45 giây)

**Nói:**

Chúng em chọn công nghệ theo nguyên tắc: hiện đại, có cộng đồng mạnh, và quan trọng nhất là **an toàn về kiểu từ đầu đến cuối**.

- **Frontend**: React 19 với Vite 7 và TypeScript. Quản lý dữ liệu từ server bằng **TanStack Query 5** — giúp caching và tự động làm mới; trạng thái toàn cục bằng **Zustand 5** — nhẹ và đơn giản hơn Redux; form dùng **React Hook Form kết hợp Zod** để validate trước khi gửi; điều hướng bằng React Router 7.
- **Backend**: NestJS 11, Prisma 6 làm ORM, xác thực bằng **JWT + Passport**, băm mật khẩu bằng bcrypt, validate DTO bằng class-validator, bảo mật cơ bản bằng Helmet và CORS.
- **Cơ sở dữ liệu**: **PostgreSQL 17** với 11 bảng, đầy đủ khóa ngoại và chỉ mục, schema và migration quản lý bằng Prisma, soft delete cho dự án và task.
- **Triển khai**: **Docker Compose**, Nginx làm cổng vào duy nhất, quy trình làm việc nhóm theo **Git Flow** với nhánh feature, develop, main.

---

## Slide 6 — Cơ sở dữ liệu: 11 bảng (≈50 giây)

**Nói:**

Sơ đồ dữ liệu của chúng em gồm 11 bảng, em xin nhóm theo 4 cụm chức năng:

- **Cụm người dùng**: `User` và `RefreshToken` — mỗi phiên đăng nhập của người dùng tương ứng một token refresh lưu trong DB.
- **Cụm dự án**: `Project` và `ProjectMember` — bảng trung gian này vừa gắn user với project, vừa lưu **vai trò** của user trong dự án đó.
- **Cụm Kanban**: `KanbanColumn`, `Task`, `TaskAssignment` — mỗi dự án có nhiều cột, mỗi cột có nhiều task, và bảng `TaskAssignment` cho phép **một task có nhiều người cùng thực hiện**.
- **Cụm cộng tác và giám sát**: `ChecklistItem`, `Comment`, `ActivityLog`, `Notification`.

Điểm chung của toàn bộ sơ đồ là **chuỗi quan hệ chính**: User → ProjectMember → Project → KanbanColumn → Task. Từ một user, có thể lần theo vai trò, dự án, cột và công việc; và mọi bảng đều tham chiếu về `User` bằng khóa ngoại, đảm bảo toàn vẹn dữ liệu ở cấp độ database chứ không chỉ ở tầng ứng dụng.

---

## Slide 7 — Quyết định thiết kế đáng chú ý (≈1 phút)

**Nói:**

Đây là 4 quyết định thiết kế mà chúng em tâm đắc nhất, và em xin giải thích lý do:

**Một — xóa mềm (soft delete).** Khi xoá dự án hay task, chúng em không DELETE khỏi database mà chỉ đặt `deletedAt`. Nhờ vậy lịch sử không mất, có thể khôi phục, và các nhật ký liên quan vẫn còn ý nghĩa.

**Hai — vị trí các thẻ cách nhau 1000 đơn vị.** Đây là bài toán kinh điển của các app kéo thả: làm sao chèn một thẻ vào giữa hai thẻ mà không phải đổi thứ tự mọi dòng khác? Cách của chúng em: mỗi thẻ lưu một số vị trí, cách nhau 1000. Muốn chèn vào giữa 1000 và 2000 thì chỉ cần gán 1500 — **không đụng đến thẻ nào khác**. Trường hợp hai thẻ quá sát nhau, chúng em tự động **đánh số lại toàn bộ cột** trong một transaction.

**Ba — trạng thái hoàn thành dựa trên dữ liệu, không dựa vào tên cột.** Chúng em **không** viết code kiểu `if (column.name === "DONE")`, vì người dùng hoàn toàn có thể đổi tên cột hoặc tạo thêm cột hoàn thành. Thay vào đó, mỗi cột có thuộc tính `isCompleted`, và task có `completedAt` — khi task vào cột hoàn thành thì ghi `completedAt`, rời khỏi thì xoá. Toàn bộ thống kê đều dựa trên hai trường này.

**Bốn — mã task theo dự án, ví dụ SHOP-1, SHOP-2.** Việc cấp số này được thực hiện **trong transaction có khóa dòng** của dự án, nên kể cả hai người tạo task cùng lúc, số mã cũng **không bao giờ trùng**.

---

## Slide 8 — Backend: một request đi qua những gì (≈50 giây)

**Nói:**

Để hiểu backend, các thầy cô có thể hình dung hành trình của một request:

Trước tiên, request đi qua **Helmet và CORS** cho các tiêu đề bảo mật và giới hạn nguồn gốc. Sau đó là **ValidationPipe**: mọi dữ liệu vào đều được kiểm tra qua DTO — thừa một trường cũng bị từ chối. Tiếp theo là **3 lớp Guard**: **Jwt Guard** xác thực danh tính, **SystemRole Guard** kiểm tra quyền hệ thống, và **ProjectRole Guard** kiểm tra quyền trong từng dự án cụ thể. Chỉ khi vượt qua cả ba, request mới đến **Controller**, rồi được gọi xuống **Service**, nơi chứa toàn bộ business logic và các truy vấn Prisma — ghi nhiều bảng thì bọc trong **transaction**.

Toàn bộ backend gồm **12 module nghiệp vụ**: auth, users, admin, projects, project-members, kanban, tasks, checklists, comments, dashboard, activity-logs và notifications.

Và chúng em có 4 quy tắc làm việc được viết rõ trong tài liệu dự án: **Controller chỉ xử lý HTTP** — không được viết query; **logic và Prisma nằm ở Service**; **ghi nhiều bảng phải dùng transaction**; và quan trọng nhất: **quyền được kiểm tra ở backend, tuyệt đối không tin giao diện** — vì giao diện thì ai cũng có thể gọi API bỏ qua.

---

## Slide 9 — Thiết kế REST API: 52 endpoint (≈45 giây)

**Nói:**

Hệ thống có tất cả **52 endpoint REST**, chia thành 5 nhóm:

- Xác thực và người dùng: 13 endpoint, ví dụ `POST /auth/login`;
- Dự án và thành viên: 11 endpoint, ví dụ mời thành viên `POST /projects/:id/members`;
- Kanban và task: 12 endpoint, trong đó đặc biệt là `PATCH /tasks/:id/move` — chuyên xử lý kéo thả;
- Checklist và bình luận: 8 endpoint;
- Tổng quan, nhật ký và health: 3 endpoint; và 5 endpoint cho thông báo.

Toàn bộ dùng tiền tố chung `/api/v1`, và **mọi route đều yêu cầu Access Token**, trừ năm route công khai: đăng nhập, đăng ký, làm mới token, đăng xuất và health check.

Về định dạng phản hồi, chúng em ép **một cấu trúc thống nhất** cho cả thành công và lỗi: thành công thì `success: true` kèm `data`; lỗi thì `success: false` kèm `statusCode` và `message` bằng tiếng Việt, ví dụ "Bạn không có quyền trong dự án này". Nhờ đó, phía frontend chỉ cần xử lý **một** định dạng duy nhất thay vì mỗi API một kiểu.

---

## Slide 10 — Xác thực và bảo mật (≈1 phút)

**Nói:**

Đây là phần chúng em đầu tư kỹ nhất. Chuẩn xác thực diễn ra như sau:

**Bước 1**, đăng nhập thành công, người dùng nhận **hai token**: Access Token sống **15 phút** và Refresh Token sống **7 ngày** đặt trong **cookie HttpOnly** — tức là JavaScript của trình duyệt không đọc được, hạn chế đánh cắp token qua XSS.

**Bước 2**, mỗi request gọi API đều gắn `Authorization: Bearer`.

**Bước 3**, khi Access Token hết hạn, API trả **401**.

**Bước 4**, frontend **tự động** gọi `/auth/refresh` để lấy token mới rồi **gửi lại request vừa thất bại** — người dùng không nhận biết được việc này, trải nghiệm không bị gián đoạn.

Ngoài luồng chính đó, chúng em áp dụng 8 lớp bảo vệ, em xin nêu tiêu biểu:

- Mật khẩu băm bằng **bcrypt** và bắt buộc độ mạnh;
- **Refresh Token chỉ lưu bản băm** trong DB — kẻ nào lấy được database cũng không dùng được token;
- **Đổi mật khẩu sẽ thu hồi mọi phiên đăng nhập đang có**;
- Giới hạn đăng nhập **10 lần mỗi 15 phút** chống brute-force;
- DTO whitelist — từ chối mọi trường thừa;
- Helmet, CORS giới hạn nguồn;
- Kiểm tra chữ ký thật của ảnh đại diện;
- Và tài khoản bị quản trị viên khoá thì **token cũ cũng lập tức vô hiệu**.

---

## Slide 11 — Phân quyền hai tầng (≈50 giây)

**Nói:**

Mô hình phân quyền của chúng em có **hai tầng độc lập**:

**Tầng một là quyền hệ thống**: `ADMIN` hoặc `USER`, lưu trên bảng User. ADMIN là quản trị viên nền tảng, được thao tác trên mọi dự án.

**Tầng hai là quyền trong dự án**: `OWNER`, `MANAGER`, `MEMBER`, `VIEWER`, lưu trên bảng `ProjectMember` — và đây là điểm chúng em muốn nhấn: **một user có thể là OWNER ở dự án A nhưng chỉ là MEMBER ở dự án B**. Vì vậy quyền dự án không được lưu trực tiếp trong bảng User mà phải gắn theo từng quan hệ thành viên.

Bảng bên phải thể hiện ma trận quyền cụ thể: **VIEWER** chỉ được xem; **MEMBER** được tạo, sửa, kéo thả, gán người, bình luận và làm checklist; **MANAGER** thêm được quyền xóa task, quản lý cột, mời và đổi vai trò thành viên, sửa và lưu trữ dự án; còn **xóa hẳn dự án** thì chỉ **OWNER** làm được.

Và một nguyên tắc lần nữa: toàn bộ ma trận này được kiểm tra ở **backend bằng Guard và trong Service** — giao diện chỉ ẩn nút cho đẹp, nhưng kể cả gọi thẳng API cũng không vượt qua được.

---

## Slide 12 — Frontend: tổ chức theo tính năng (≈40 giây)

**Nói:**

Sang phía frontend, chúng em tổ chức mã nguồn **theo tính năng (feature-based)** thay vì theo loại file: thư mục `features/` gồm auth, projects, kanban, members, dashboard, activity, notifications, profile và admin — mỗi tính năng tự chứa trang, API call và store của riêng nó, kèm các thư mục dùng chung như `app` cho router, `components` cho layout và UI, `hooks`.

Luồng dữ liệu hoạt động thế này: component dùng **useQuery / useMutation của TanStack Query** để gọi các hàm trong file `*.api.ts`, vốn đi qua một axios instance duy nhất tại `api/http.ts` — nơi tự gắn token vào header và **tự động làm mới token khi gặp 401**. Các trạng thái toàn cục như người dùng đang đăng nhập, dự án đang chọn, giao diện sáng hay tối, được lưu trong **Zustand**. Còn mọi form đều qua **React Hook Form + Zod** để kiểm tra ngay trên trình duyệt trước khi gửi lên server.

---

## Slide 13 — Giao diện mang dấu ấn thương hiệu (≈30 giây)

**Nói:**

Về trải nghiệm người dùng, chúng em không muốn sản phẩm trông giống template mặc định:

- Trang **đăng nhập là một thẻ trượt** giữa form đăng nhập và form đăng ký — chuyển đổi mượt mà thay vì load lại trang;
- Hệ thống **màu thương hiệu** xây trên một **bộ token màu dùng chung**, nên toàn bộ ứng dụng đồng bộ tuyệt đối;
- **Chế độ sáng và tối** đổi bằng một nút và hệ thống **nhớ lựa chọn** của người dùng;
- **Loading riêng** cho từng khu vực, có skeleton thay vì màn hình trắng;
- Và **responsive** đầy đủ: trên điện thoại, menu trượt gọn gàng.

Cụ thể từng màn hình, chúng em sẽ đi vào phần demo.

---

## Slide 14 — Demo 1: đăng nhập và quản lý dự án (chuyển sang demo)

**Nói (dẫn dắt vào demo):**

Bây giờ chúng em xin mời thầy cô xem sản phẩm **đang chạy thật bằng Docker Compose trên máy của nhóm em** — đầy đủ 3 container frontend, backend và PostgreSQL.

*(Thao tác: mở http://localhost, đăng nhập bằng admin@example.com / Admin@123)*

Đầu tiên là đăng nhập: em nhập email, mật khẩu — hệ thống kiểm tra độ mạnh mật khẩu, và như em đã trình bày, đăng nhập xong sẽ nhận hai token JWT với Refresh Token nằm trong cookie HttpOnly. *(Chỉ vào tab Network nếu có thời gian: sau khi đăng nhập, mọi request đều có Authorization Bearer.)*

Đăng nhập xong là **danh sách dự án**: mỗi dự án có **ảnh bìa sinh riêng theo mã dự án**, có bộ lọc theo trạng thái — đang hoạt động, đã lưu trữ — và có thể chuyển giữa **xem dạng lưới và dạng danh sách**.

*(Thao tác: tạo một dự án mới, ví dụ "Hệ thống POS", chỉ vào 3 cột mặc định TODO – DOING – DONE.)*

Chú ý: ngay khi tạo dự án, hệ thống đã **tự sinh ba cột mặc định TODO, DOING, DONE** — đây chính là phần transaction 4 bước trong invariant mà nhóm em đề ra: tạo Project, gán người tạo làm OWNER, và tạo đủ ba cột — tất cả trong một transaction, thiếu một bước thì rollback toàn bộ.

---

## Slide 15 — Demo 2: bảng Kanban

**Nói (trong lúc demo):**

Đây là trái tim của sản phẩm — bảng Kanban.

*(Thao tác: kéo một task sang cột khác.)*

Khi em kéo thả thẻ task này, các thầy cô thấy **giao diện đổi trạng thái ngay lập tức** — người dùng không phải chờ — sau đó request mới gửi lên server để xác nhận. Đó là kỹ thuật optimistic update với TanStack Query.

*(Chỉ vào thẻ task)*: mỗi thẻ có **vạch màu bên cạnh thể hiện độ ưu tiên** — đỏ đậm là khẩn cấp, cam là cao, vàng là trung bình, xám là thấp. **Hạn chót cũng nhìn là biết**: quá hạn hiện chữ màu đỏ, sắp đến hạn màu vàng. Và mỗi cột có **tỷ lệ hoàn thành** ngay trên đầu cột, giúp nhìn một cái là biết cột nào đang dồn việc.

---

## Slide 16 — Demo 3: chi tiết công việc

**Nói (trong lúc demo):**

*(Thao tác: mở một task)*

Mở chi tiết một công việc, chúng em có: **thanh bước trạng thái** để chuyển trạng thái không cần kéo thả, đổi **độ ưu tiên**, đặt **hạn chót**, và **gán nhiều người cùng thực hiện** — nhớ rằng dưới database đây là bảng TaskAssignment riêng, không phải một cột assigneeId.

*(Chỉ vào checklist)*: bên dưới là **checklist các nhiệm vụ phụ** với **vòng tiến độ** cho biết hoàn thành bao nhiêu phần trăm — đúng bản chất, tiến độ này tính theo dữ liệu, không phải tự đếm tay.

*(Thao tác: viết bình luận có nhắc tên @ai đó)*

Và trong bình luận, khi em gõ dấu @ và nhắc tên một thành viên, thành viên đó sẽ **nhận ngay thông báo** — đây là một trong ba nguồn sinh thông báo của hệ thống.

---

## Slide 17 — Demo 4: tổng quan và nhật ký

**Nói (trong lúc demo):**

*(Vào trang Tổng quan của dự án)*

Trang tổng quan trả lời câu hỏi mà slide 2 đã đặt ra: **ai đang quá tải, ai đang rảnh?** Ở đây có: tổng số task, số đã hoàn thành, đang làm, quá hạn; biểu đồ **phân bổ task theo từng cột**; và quan trọng nhất là bảng **khối lượng từng thành viên**. Ngoài ra có nút **xuất báo cáo CSV** để mang đi họp hoặc lưu trữ.

*(Vào trang Nhật ký)*

Trang **nhật ký hoạt động** là dòng thời gian ghi lại mọi thao tác: tạo, sửa, di chuyển task, gán người, đổi vai trò — nhóm theo từng ngày. Bảng này là **append-only**: chỉ ghi thêm, không có API nào cho phép sửa hay xoá log, nên đây là nguồn tin cậy khi cần truy vết.

---

## Slide 18 — Demo 5: thành viên, quản trị, thông báo

**Nói (trong lúc demo):**

*(Vào trang Thành viên)*: mỗi thành viên một **thẻ hiển thị theo vai trò** — OWNER, MANAGER, MEMBER, VIEWER; OWNER có thể **đổi vai trò** và **mời người mới** ngay tại đây.

*(Đăng xuất, đăng nhập admin, vào trang Quản trị)*: với tài khoản ADMIN hệ thống, có trang **quản trị người dùng**: tìm kiếm, và **khoá / mở khoá tài khoản**. Như slide 10 em đã nói: tài khoản bị khoá thì cả token cũ cũng không dùng được nữa.

*(Chỉ vào chuông thông báo)*: và **thông báo** — khi được giao việc, khi bị nhắc tên trong bình luận, khi task mình liên quan đổi trạng thái — kèm số chưa đọc ngay trên thanh điều hướng.

---

## Slide 19 — Kịch bản demo trực tiếp (dự phòng / tóm tắt luồng)

**Nói (nếu trình bày slide này thay vì demo live, hoặc dùng làm checklist khi demo):**

Nếu mạng hoặc máy có trục trặc, đây là kịch bản demo 7 bước mà nhóm em chuẩn bị, chạy trên hai tài khoản seed: quản trị viên `admin@example.com` và người dùng thường `member@example.com`, với backend, frontend và trình duyệt mở sẵn:

1. Đăng nhập bằng tài khoản quản trị;
2. Tạo dự án mới, chỉ ra ba cột mặc định tự sinh;
3. Mời thành viên và chọn vai trò;
4. Tạo task, gán người, đặt ưu tiên và hạn chót;
5. Kéo task sang DONE, rồi xem **nhật ký và thông báo** cập nhật;
6. Mở chi tiết task: checklist và bình luận nhắc tên;
7. Kết thúc bằng trang tổng quan, trang quản trị và chuyển chế độ sáng tối.

---

## Slide 20 — Đối chiếu yêu cầu bài tập lớn (≈40 giây)

**Nói:**

Xin quay lại với yêu cầu của bài tập lớn để tự đối chiếu, từng dòng một:

- **Cách lập trình frontend**: React + TypeScript, quản lý state server bằng TanStack Query, state client bằng Zustand, tổ chức mã theo tính năng — chi tiết ở slide 12, 13.
- **Cách lập trình backend**: NestJS theo module, 3 lớp Guard, DTO validation, transaction, JWT hai token — slide 8, 10, 11.
- **Cơ sở dữ liệu**: PostgreSQL + Prisma, 11 bảng, migration có lịch sử, soft delete — slide 6, 7.
- **Xây dựng các API**: 52 endpoint REST với định dạng phản hồi thống nhất — slide 9.
- **Demo toàn bộ chức năng**: vừa trình bày ở slide 14 đến 19.

Và điểm công nghệ mà đề bài nêu tên: **toàn bộ sản phẩm chạy bằng đúng một lệnh `docker compose up`** với 3 container — frontend + Nginx, backend, PostgreSQL; còn khi phát triển thì chạy riêng frontend và backend như quy trình chúng em mô tả trong README.

---

## Slide 21 — Kết quả và chất lượng (≈40 giây)

**Nói:**

Về kết quả định lượng sau toàn bộ quá trình làm việc nhóm:

- **52 endpoint REST**;
- **11 bảng dữ liệu**;
- **12 module backend**;
- **83 ca kiểm thử backend đều đạt**;
- khoảng **20.000 dòng mã TypeScript**;
- và **95 commit** qua quy trình Git Flow.

Còn về chất lượng, chúng em tự đặt cho mình **"cổng chất lượng" bắt buộc trước khi gộp mã vào develop**: TypeScript không còn lỗi nào, ESLint không lỗi, build frontend phải thành công, và toàn bộ 83 ca kiểm thử backend phải đạt. Không đạt một trong các điều này thì Pull Request không được merge — đó là lý do số liệu trên đây là số liệu "sạch" chứ không phải con số lý thuyết.

---

## Slide 22 — Hạn chế và hướng phát triển (≈40 giây)

**Nói:**

Chúng em cũng thẳng thắn nhìn nhận các hạn chế hiện tại, và mỗi hạn chế đều có hướng giải quyết cụ thể:

**Một**, thông báo hiện tại cập nhật bằng cách **hỏi server định kỳ** — polling — chưa phải thời gian thực thật. Hướng phát triển là chuyển sang **WebSocket** để server đẩy thông báo tức thời.

**Hai**, kéo thả task mới thả được vào **cuối cột**; hướng phát triển là cho chọn **vị trí thả giữa các thẻ khác** — phần lõi thuật toán vị trí 1000 đơn vị chúng em đã sẵn sàng cho việc này.

**Ba**, chưa có tính năng **quên mật khẩu và xác minh email** — cần bổ sung gửi email, và mở rộng thành **email nhắc hạn chót** tự động.

**Bốn**, ảnh đại diện đang lưu trên **ổ đĩa của máy chủ** — hướng đi là dịch vụ lưu trữ đám mây, đồng thời mở rộng cho phép **đính kèm tệp vào task**.

**Và năm**, muốn nâng tầm kiểm thử: bổ sung **kiểm thử tích hợp và kiểm thử giao diện tự động** bên cạnh 83 unit test hiện có.

---

## Slide 23 — Cảm ơn (≈20 giây)

**Nói:**

Kính thưa thầy cô và các bạn, phần trình bày của nhóm em đến đây là kết thúc. Qua bài tập lớn này, chúng em không chỉ tạo ra một sản phẩm quản lý dự án hoàn chỉnh chạy được bằng một lệnh Docker Compose, mà quan trọng hơn là học được cách **làm việc nhóm thật sự**: quy ước code, quy ước branch, review lẫn nhau, và bảo vệ chất lượng bằng kiểm thử tự động.

Em xin thay mặt nhóm **cảm ơn thầy cô và các bạn đã lắng nghe**. Nhóm em rất mong nhận được câu hỏi và góp ý ạ.

---

# Phụ lục: Câu hỏi dự kiến từ giảng viên & gợi ý trả lời

**1. Vì sao dùng 2 token (Access + Refresh) thay vì 1 token dài hạn?**
→ Access Token ngắn hạn (15 phút) giảm thiểu rủi ro khi bị lộ; Refresh Token dài hạn chỉ gửi qua cookie HttpOnly, chỉ lưu bản băm trong DB, có thể thu hồi (đổi mật khẩu, khoá tài khoản) — thứ mà token tự chứa (stateless) không làm được.

**2. Vì sao Nginx nằm chung container với frontend, không tách riêng?**
→ Nginx vừa phục vụ file tĩnh của React vừa làm reverse proxy — một container đảm nhiệm cả hai vai trò, giảm số container và độ phức tạp. Browser chỉ cần biết đúng một origin.

**3. Backend vì sao không publish cổng 3000 ra ngoài?**
→ Chỉ `expose` trong mạng nội bộ Docker. Mọi request từ ngoài bắt buộc đi qua Nginx — kiểm soát tập trung (CORS, header, giới hạn), giảm bề mặt tấn công.

**4. Vị trí cách nhau 1000 hoạt động khi thẻ hết chỗ?**
→ Khi khoảng trống giữa 2 thẻ < 1, chạy transaction đánh số lại toàn bộ cột (bước 1000). Rất hiếm khi xảy ra nên chi phí chấp nhận được.

**5. Nếu 2 người kéo cùng một task cùng lúc thì sao?**
→ Request move chạy trong transaction; trạng thái cột/vị trí kiểm tra lại khi ghi, cạnh tranh được xử lý ở tầng DB, một trong hai nhận lỗi và frontend rollback giao diện.

**6. Thông báo polling có tốn tài nguyên không?**
→ Có, đó là hạn chế đã thừa nhận (slide 22); hướng phát triển là WebSocket. Với quy mô đồ án, polling đơn giản, dễ triển khai và hoạt động ổn định.

**7. 83 ca kiểm thử kiểm tra những gì?**
→ Kiểm thử backend bằng tsx, tập trung vào nghiệp vụ: xác thực, phân quyền hai tầng, invariant (transaction tạo dự án, completedAt, mã task không trùng).
