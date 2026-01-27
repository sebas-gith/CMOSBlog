---
title: '199. Binary Tree Right Side View'
description: 'Este reto consiste en identificar el último nodo de cada nivel de un árbol binario, simulando lo que verías parado a su derecha'
pubDate: 'Nov 25 2025'
heroImage: ''
difficulty: 'Medium'
platform: 'leetcode'
---

Este reto consiste en identificar el **último nodo de cada nivel** de un árbol binario, simulando lo que verías parado a su derecha. Para resolverlo, utilicé un algoritmo de **Recorrido por Niveles (BFS)**, capturando únicamente el elemento final de cada fila para obtener la perspectiva correcta.


```cpp
#include <iostream>
#include <queue>

using namespace std;



struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

class Solution {
public:
    vector<int> rightSideView(TreeNode* root) {
        vector<int> ans; 
        if(root == nullptr) return {};
        queue<TreeNode*> q;
        q.push(root);
        while(!q.empty()){
            int qSize = q.size();

            for(int i = 0; i < qSize; ++i){
                TreeNode* current = q.front();
                q.pop();
                if(current->left) 
                    q.push(current->left);
                if(current->right)
                    q.push(current->right);
                
                if(i == qSize - 1)
                    ans.push_back(current->val);
            }


        }

        return ans;
        
    }
};

```
