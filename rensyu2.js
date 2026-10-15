const numbers = [1, 2, 3, 4, 5];

// map: 各要素を2倍に加工する
const doubled = numbers.map(num => num * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

// filter: 3以上の要素だけ抽出する
const overThree = numbers.filter(num => num >= 3);
console.log(overThree); // [3, 4, 5]