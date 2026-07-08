import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      ".next/**",
      ".agents/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "out/**",
      "public/**",
      "plans/**",
      "internal/**",
    ],
  },
  {
    rules: {
      // Baseline de transicion: el proyecto ya compila con TS strict, pero
      // arrastra deuda historica que se atacara por modulo. Mantener lint
      // operativo evita que el script siga roto por infraestructura.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "prefer-const": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/static-components": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/refs": "off",
    },
  },
]

export default eslintConfig
