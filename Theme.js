<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Montserrat:wght@800&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<script>
  // ==========================================================================
  // HỆ THỐNG TOAST & POPUP CHUNG (GỌC DƯỚI PHẢI)
  // ==========================================================================
  const SystemToast = Swal.mixin({ 
    toast: true, 
    position: 'bottom-end', 
    showConfirmButton: false, 
    timer: 3000, 
    timerProgressBar: true,
    showClass: { popup: 'animate__animated animate__fadeInUp' },
    hideClass: { popup: 'animate__animated animate__fadeOutDown' },
    didOpen: (toast) => { 
      toast.addEventListener('mouseenter', Swal.stopTimer); 
      toast.addEventListener('mouseleave', Swal.resumeTimer); 
    }
  });

  function showToast(message, type = 'info') {
    SystemToast.fire({ icon: type, title: message });
  }

  // ==========================================================================
  // LOGOUT CONFIRM - ĐÃ UPDATE CHO FRONTEND ĐỘC LẬP
  // ==========================================================================
  function logoutConfirm() {
    Swal.fire({
      title: 'Đăng xuất?', 
      text: "Bạn muốn thoát khỏi phiên làm việc?", 
      icon: 'question',
      showCancelButton: true, 
      confirmButtonColor: '#ef4444', 
      cancelButtonText: 'Hủy', 
      confirmButtonText: 'Đăng xuất'
    }).then((r) => {
      if (r.isConfirmed) { 
        localStorage.removeItem('userData'); 
        window.location.href = 'login.html';  // Redirect về trang login nội bộ
      }
    });
  }

  // ==========================================================================
  // UPLAN FUNCTIONS (Giữ nguyên, chỉ chỉnh toast nếu cần)
  // ==========================================================================
  const ToastBase = Swal.mixin({
    toast: true, 
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3000, timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  });

  function showToast(msg, type='success') {
    ToastBase.fire({ icon: type, title: msg });
  }

  function showLoading(msg = 'Đang xử lý...') {
    ToastBase.fire({
      icon: 'info', title: msg,
      timer: null, timerProgressBar: false,
      didOpen: () => { Swal.showLoading(); }
    });
  }

  function closeLoading() { Swal.close(); }

  function SystemConfirm(title, message, btnText = "Đồng ý", btnCancel = "Hủy bỏ") {
    return Swal.fire({
      html: `
        <div class="modern-content">
          <div class="modern-icon-box"><i class="bi bi-question-lg"></i></div>
          <h3 class="modern-title">${title}</h3>
          <p class="modern-text">${message}</p>
        </div>
        <div class="modern-actions"></div> `,
      showCancelButton: true,
      confirmButtonText: btnText,
      cancelButtonText: btnCancel,
      buttonsStyling: false,
      customClass: {
        popup: 'modern-popup',
        confirmButton: 'btn-sys-yes',
        cancelButton: 'btn-sys-no',
        actions: 'modern-actions' 
      },
      width: 600,
      focusConfirm: false,
      allowOutsideClick: false
    });
  }

  function SystemForm(title, htmlBody, preConfirmFn, btnText = "Xác nhận", btnCancel = "Hủy bỏ") {
    return Swal.fire({
      html: `
        <div class="modern-content">
          <div class="modern-icon-box"><i class="bi bi-file-earmark-text"></i></div>
          <h3 class="modern-title">${title}</h3>
          <div class="modern-form-body">
              ${htmlBody}
          </div>
        </div>
        <div class="modern-actions"></div>
      `,
      showCancelButton: true,
      confirmButtonText: btnText,
      cancelButtonText: btnCancel,
      buttonsStyling: false,
      customClass: {
        popup: 'modern-popup',
        confirmButton: 'btn-sys-yes',
        cancelButton: 'btn-sys-no',
        actions: 'modern-actions' 
      },
      width: 600,
      focusConfirm: false,
      allowOutsideClick: false,
      preConfirm: preConfirmFn
    });
  }

  // Xóa toast cũ nếu có (giữ nguyên)
  document.addEventListener("DOMContentLoaded", function() {
    var oldToast = document.getElementById("toast");
    if(oldToast) oldToast.style.display = "none";
  });
</script>