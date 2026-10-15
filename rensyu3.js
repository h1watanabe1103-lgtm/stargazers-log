// オブジェクトの分割代入
const user = { id: 1, name: "田辺", role: "エンジニア" };
const { name, role } = user;

console.log(name); // "田辺"
console.log(role); // "エンジニア"

// 配列の分割代入
const members = ["山田", "田辺"];
const [firstMember, secondMember] = members;

console.log(firstMember);  // "山田"
console.log(secondMember); // "田辺"