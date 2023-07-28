window.Utils = {
  customizer: function customizer(targetValue, sourceValue) {
    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      return targetValue.concat(sourceValue);
    }
    // В остальных случаях используем значения из исходного объекта
    return sourceValue;
  },
  mergeWith: function mergeWith(target, source, customizer) {
    for (let key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          target.hasOwnProperty(key) &&
          typeof target[key] === "object" &&
          typeof source[key] === "object"
        ) {
          target[key] = mergeWith(target[key], source[key], customizer);
        } else {
          target[key] = customizer(target[key], source[key]);
        }
      }
    }
    return target;
  },
  debounce: function debounce(callee, timeoutMs) {
    // Как результат возвращаем другую функцию.
    // Это нужно, чтобы мы могли не менять другие части кода,
    // чуть позже мы увидим, как это помогает.
    return function perform(...args) {
      // В переменной previousCall мы будем хранить
      // временную метку предыдущего вызова...
      let previousCall = this.lastCall;

      // ...а в переменной текущего вызова —
      // временную метку нынешнего момента.
      this.lastCall = Date.now();

      // Нам это будет нужно, чтобы потом сравнить,
      // когда была функция вызвана в этот раз и в предыдущий.
      // Если разница между вызовами меньше, чем указанный интервал,
      // то мы очищаем таймаут...
      if (previousCall && this.lastCall - previousCall <= timeoutMs) {
        clearTimeout(this.lastCallTimer);
      }

      // ...который отвечает за непосредственно вызов функции-аргумента.
      // Обратите внимание, что мы передаём все аргументы ...args,
      // который получаем в функции perform —
      // это тоже нужно, чтобы нам не приходилось менять другие части кода.
      this.lastCallTimer = setTimeout(() => callee(...args), timeoutMs);

      // Если таймаут был очищен, вызова не произойдёт
      // если он очищен не был, то callee вызовется.
      // Таким образом мы как бы «отодвигаем» вызов callee
      // до тех пор, пока «снаружи всё не подуспокоится».
    };
  },
};
