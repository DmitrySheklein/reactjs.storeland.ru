!(function (e, r) {
  'object' == typeof exports && 'undefined' != typeof module
    ? r(exports, require('immer'), require('react'))
    : 'function' == typeof define && define.amd
      ? define(['exports', 'immer', 'react'], r)
      : r(((e = e || self).useImmer = {}), e.immer, e.react);
})(this, function (e, r, n) {
  (e.useImmer = function (e) {
    var t = n.useState(function () {
        return r.freeze('function' == typeof e ? e() : e, !0);
      }),
      u = t[1];
    return [
      t[0],
      n.useCallback(function (e) {
        u('function' == typeof e ? r.produce(e) : r.freeze(e));
      }, []),
    ];
  }),
    (e.useImmerReducer = function (e, t, u) {
      var o = n.useMemo(
        function () {
          return r.produce(e);
        },
        [e]
      );
      return n.useReducer(o, t, u);
    });
});
//# sourceMappingURL=use-immer.umd.js.map
