export default (expr, t, f) => expr ? t() : f ? f() : null
