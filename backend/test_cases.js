
// Basic Test Cases for the first few problems
const problemTestCases = {
    "Two Sum": {
        testCases: [
            { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
            { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
            { input: { nums: [3, 3], target: 6 }, expected: [0, 1] }
        ]
    },
    "Valid Parentheses": {
        testCases: [
            { input: { s: "()" }, expected: true },
            { input: { s: "()[]{}" }, expected: true },
            { input: { s: "(]" }, expected: false },
            { input: { s: "([)]" }, expected: false },
            { input: { s: "{[]}" }, expected: true }
        ]
    },
    "Reverse Linked List": {
        testCases: [
            { input: { head: [1, 2, 3, 4, 5] }, expected: [5, 4, 3, 2, 1] },
            { input: { head: [1, 2] }, expected: [2, 1] },
            { input: { head: [] }, expected: [] }
        ],
        isLinkedList: true
    },
    "Binary Tree Inorder Traversal": {
        testCases: [
            { input: { root: [1, null, 2, 3] }, expected: [1, 3, 2] },
            { input: { root: [] }, expected: [] },
            { input: { root: [1] }, expected: [1] }
        ],
        isTree: true
    },
    "Climbing Stairs": {
        testCases: [
            { input: { n: 2 }, expected: 2 },
            { input: { n: 3 }, expected: 3 },
            { input: { n: 4 }, expected: 5 }
        ]
    }
};

module.exports = problemTestCases;
