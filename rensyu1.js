// アロー関数
const greet2 = (name) => {
  return `こんにちは、${name}さん`;
};

// 処理が1行の場合は return と {} を省略可能
const greet3 = name => `こんにちは、${name}さん`;

console.log(greet3("田辺")); // "こんにちは、田辺さん"