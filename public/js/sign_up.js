  $(function () {
      $('#user_id').keyup(function () {

          $.get('/process/checkId?id=' + $('#user_id').val(), function (result) {
              if (result.rows != null) {
                  console.dir(result)
                  alert("아이디가 이미 존재합니다.");
            
            
              } else {
                  $('#user_id').html("사용 가능합니다.");
              }
          });
      });
     
  });

  function myFunction() {
      var x = document.getElementById("fname");
      x.value = x.value.toUpperCase();
  }
