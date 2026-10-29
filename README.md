# Máy Tính Casio fx-580VN X (ClassWiz) - Web Emulator

Mô phỏng máy tính bỏ túi học sinh quốc dân **Casio fx-580VN X ClassWiz** phiên bản tiếng Việt chạy trên trình duyệt web với giao diện chân thực, âm thanh phím bấm sống động và đầy đủ các tính năng mạnh mẽ.

🌐 **Trải nghiệm trực tiếp trên Web (GitHub Pages):** [https://haison08.github.io/casiofx580/](https://haison08.github.io/casiofx580/)

---

## 🚀 Cách Chạy Ứng Dụng

Chỉ cần mở tệp `index.html` trong bất kỳ trình duyệt nào (Chrome, Safari, Edge, Firefox, Cốc Cốc):

```bash
# Cách 1: Mở trực tiếp trên macOS
open index.html

# Cách 2: Sử dụng Python HTTP server
python3 -m http.server 8080
# Sau đó mở trình duyệt tại: http://localhost:8080
```

---

## ✨ Các Tính Năng Nổi Bật

1. **Giao Diện Chân Thực (Authentic Hardware Design):**
   - Họa tiết vân carbon 3D đặc trưng của dòng máy ClassWiz fx-580VN X.
   - Nút bấm 3D đa tầng có độ nảy, đổ bóng chân thực và nhãn ký hiệu `SHIFT` (màu vàng kim), `ALPHA` (màu đỏ hồng).
   - Màn hình LCD ma trận điểm độ nét cao, có thanh trạng thái biểu tượng (`S`, `A`, `D`/`R`, `Math`, `▲▼`).
   - Âm thanh gõ phím nhẹ nhàng được tổng hợp chân thực bằng Web Audio API (có nút bật/tắt âm thanh).

2. **Các Chế Độ Hoạt Động (Menu Modes):**
   - **Mode 1: Tính toán thông thường (Calculate):**
     - Đầy đủ phép tính số học, phân số (`a/b`), căn bậc 2, căn bậc $n$, lũy thừa, giai thừa, giá trị tuyệt đối.
     - Lượng giác (`sin`, `cos`, `tan`, `arcsin`, `arccos`, `arctan`) theo độ (DEG) hoặc Radian (RAD).
     - Logarit cơ số 10 (`log`), logarit tự nhiên (`ln`), logarit cơ số bất kỳ $\log_a(b)$.
     - Hằng số $\pi$ và $e$, ký hiệu khoa học $\times 10^x$.
     - Chuyển đổi định dạng kết quả qua nút **`S<=>D`** (chuyển đổi qua lại giữa Phân số tối giản $\leftrightarrow$ Số thập phân).
     - Phím **`CALC`**: tính giá trị biểu thức chứa biến $X$ với giá trị nhập vào bất kỳ.
     - Phím **`Ans`** lưu trữ kết quả phép tính trước đó.
   - **Mode 9: Phương trình / Hệ phương trình (Equation/Func):**
     - **Giải phương trình bậc 2 ($ax^2 + bx + c = 0$):** Tìm nghiệm thực/nghiệm phức, tọa độ điểm cực trị (GTLN / GTNN) của parabol.
     - **Giải phương trình bậc 3 ($ax^3 + bx^2 + cx + d = 0$):** Tìm tối đa 3 nghiệm.
     - **Giải hệ 2 phương trình bậc nhất 2 ẩn ($a_1x + b_1y = c_1, a_2x + b_2y = c_2$):** Tìm nghiệm $(x, y)$.
   - **Mode 8: Bảng giá trị (Table):**
     - Nhập hàm $f(x)$, khoảng giá trị Start, End, Step và tạo bảng giá trị $x \to f(x)$.

3. **Hỗ Trợ Bàn Phím Máy Tính:**
   - Số `0-9`, `.`, dấu `+`, `-`, `*`, `/`.
   - `Enter` hoặc `=` để thực hiện tính toán.
   - `Backspace` để xóa 1 ký tự (`DEL`), `Escape` để xóa sạch màn hình (`AC`).
   - `(` và `)` cho dấu ngoặc đơn.

