// 存储所有功法
let skills = [];

// 内功经脉系统
class MeridianSystem {
    constructor() {
        // 存储最优路径
        this.optimalPath = null;
        // 存储激活的功法
        this.activatedSkills = [];
    }

    // 寻找最优经脉路径
    findOptimalPath(skillsToActivate) {
        if (!skillsToActivate || skillsToActivate.length === 0) {
            return null;
        }
        
        // 记录处理开始时间，用于性能监控
        const startTime = performance.now();
        
        // 如果功法数量过多，显示警告
        if (skillsToActivate.length > 20) {
            console.warn(`处理的功法数量(${skillsToActivate.length})过多，计算可能较慢`);
        }
        
        // 1. 初始化结果
        let bestPath = [];
        let bestRepeatedNodes = 0;
        let bestActivatedSkills = [];
        
        // 2. 检测是否能够激活所有功法
        let canActivateAll = this.canActivateAllSkills(skillsToActivate);
        
        if (!canActivateAll) {
            // 如果无法激活所有功法，返回空结果或部分结果
            return {
                path: [],
                activated: [],
                repeatedNodes: 0
            };
        }
        
        // 3. 先尝试贪婪算法，寻找有共用穴位的功法
        const greedyResult = this.findGreedyPath(skillsToActivate);
        bestPath = greedyResult.path;
        bestRepeatedNodes = greedyResult.repeatedNodes;
        bestActivatedSkills = greedyResult.activated;
        
        // 4. 尝试优化路径，减少总穴位数
        const optimizedResult = this.optimizePath(bestPath, skillsToActivate);
        
        // 5. 更新最优结果
        this.optimalPath = optimizedResult.path;
        this.activatedSkills = skillsToActivate; // 确保所有选中功法都激活
        
        // 计算处理时间，如果超过阈值则记录警告
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        if (processingTime > 1000) { // 如果处理时间超过1秒
            console.warn(`路径优化耗时 ${(processingTime/1000).toFixed(2)} 秒`);
        }
        
        return {
            path: optimizedResult.path,
            activated: skillsToActivate,
            repeatedNodes: optimizedResult.repeatedNodes,
            originalTotal: optimizedResult.originalTotal
        };
    }
    
    // 检查是否可以激活所有选中的功法
    canActivateAllSkills(skills) {
        // 简化版：假设所有功法都可以被激活
        // 实际项目中，这里应该有更复杂的逻辑来确认是否可以激活所有功法
        return true;
    }
    
    // 贪婪算法寻找共用穴位的路径
    findGreedyPath(skills) {
        // 1. 收集所有可能的穴位
        const allAcupoints = new Set();
        skills.forEach(skill => {
            skill.sequence.forEach(point => {
                allAcupoints.add(point);
            });
        });
        
        // 2. 找到出现次数最多的穴位
        const acupointCounts = {};
        skills.forEach(skill => {
            skill.sequence.forEach(point => {
                acupointCounts[point] = (acupointCounts[point] || 0) + 1;
            });
        });
        
        // 3. 按出现频率排序穴位
        const sortedAcupoints = Object.keys(acupointCounts).sort((a, b) => {
            return acupointCounts[b] - acupointCounts[a];
        }).map(Number);
        
        // 4. 创建初始路径 (使用所有穴位)
        const initialPath = sortedAcupoints.slice();
        
        // 5. 检查路径是否激活所有功法
        const activated = skills.filter(skill => 
            this.isSkillActivated(skill.sequence, initialPath)
        );
        
        // 6. 如果未激活所有功法，需要添加额外穴位
        if (activated.length < skills.length) {
            const missingSkills = skills.filter(skill => 
                !this.isSkillActivated(skill.sequence, initialPath)
            );
            
            // 为每个未激活的功法添加缺失的穴位
            missingSkills.forEach(skill => {
                let currentPath = initialPath.slice();
                
                // 检查技能序列中哪些穴位缺失
                const stillNeeded = this.findMissingAcupoints(skill.sequence, currentPath);
                
                // 添加缺失的穴位
                initialPath.push(...stillNeeded);
            });
        }
        
        // 7. 计算重复穴位数
        const repeatedNodes = this.countRepeatedNodes(initialPath);
        
        return {
            path: initialPath,
            activated: skills,
            repeatedNodes: repeatedNodes
        };
    }
    
    // 找到技能序列中缺失的穴位
    findMissingAcupoints(skillSequence, path) {
        const stillNeeded = [];
        let pathIndex = 0;
        let skillIndex = 0;
        
        // 尝试匹配已有路径
        while (pathIndex < path.length && skillIndex < skillSequence.length) {
            if (path[pathIndex] === skillSequence[skillIndex]) {
                skillIndex++;
            }
            pathIndex++;
        }
        
        // 添加剩余未匹配的穴位
        while (skillIndex < skillSequence.length) {
            stillNeeded.push(skillSequence[skillIndex]);
            skillIndex++;
        }
        
        return stillNeeded;
    }
    
    // 尝试优化路径，最大化穴位重用
    optimizePath(initialPath, skills) {
        // 我们需要完全重写这个方法，使用一种能够保持序列连续性的算法
        
        // 1. 构建所有功法的完整序列
        const skillsSequences = skills.map(skill => ({
            name: skill.name,
            sequence: skill.sequence.slice() // 复制一份序列
        }));
        
        // 2. 查找重叠部分
        const mergedPath = this.mergePaths(skillsSequences);
        
        // 3. 计算重复穴位数量
        // 原始所有功法的穴位总数
        const totalOriginalNodes = skillsSequences.reduce((sum, skill) => sum + skill.sequence.length, 0);
        // 合并后的路径长度
        const mergedPathLength = mergedPath.length;
        // 重复/共用的穴位数量 (使用更准确的方法计算)
        const repeatedNodes = this.calculateRepeatedNodes(skillsSequences, mergedPath);
        
        return {
            path: mergedPath,
            repeatedNodes: repeatedNodes,
            originalTotal: totalOriginalNodes
        };
    }
    
    // 计算路径中重复穴位数量 (基于功法序列和合并路径)
    calculateRepeatedNodes(skillsSequences, mergedPath) {
        // 计算每个功法的穴位总数
        const totalAcupointsInSkills = skillsSequences.reduce((sum, skill) => 
            sum + skill.sequence.length, 0);
        
        // 计算合并路径的长度
        const mergedPathLength = mergedPath.length;
        
        // 如果所有功法独立排列需要的穴位总数与合并路径长度的差值
        // 就是优化/重用的穴位数量
        return totalAcupointsInSkills - mergedPathLength;
    }
    
    // 合并功法路径，保持序列连续性并最大化穴位重用
    mergePaths(skillsSequences) {
        if (skillsSequences.length === 0) return [];
        if (skillsSequences.length === 1) return skillsSequences[0].sequence;
        
        // 尝试使用新的优化算法
        try {
            const optimizedResult = this.optimizedGreedyPathFinder(skillsSequences);
            console.info(`使用优化算法生成路径，总重叠数: ${optimizedResult.totalOverlap}`);
            return optimizedResult.path;
        } catch (error) {
            console.warn('优化算法失败，回退到原算法: ', error);
            // 回退到现有的算法
            const simplePath = skillsSequences.flatMap(skill => skill.sequence);
            return simplePath;
        }
    }
    
    // 查找两个序列间的最大重叠部分
    findMaximumOverlap(seq1, seq2) {
        if (!seq1 || !seq2 || seq1.length === 0 || seq2.length === 0) {
            return { overlap: 0, overlapIndex: -1 };
        }
        
        // 优化：只需要检查最大可能重叠长度
        const maxPossible = Math.min(seq1.length, seq2.length);
        let maxOverlap = 0;
        let maxOverlapIndex = -1;
        
        // 检查seq1的尾部与seq2的头部的重叠
        for (let i = 1; i <= maxPossible; i++) {
            const seq1Suffix = seq1.slice(seq1.length - i);
            const seq2Prefix = seq2.slice(0, i);
            
            let match = true;
            for (let j = 0; j < i; j++) {
                if (seq1Suffix[j] !== seq2Prefix[j]) {
                    match = false;
                    break;
                }
            }
            
            if (match) {
                maxOverlap = i;
                maxOverlapIndex = seq1.length - i;
            }
        }
        
        return { overlap: maxOverlap, overlapIndex: maxOverlapIndex };
    }
    
    // 随机打乱数组（辅助函数）
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    // 检查功法是否可以被连续激活
    canActivateSkillConsecutively(skillSeq, path) {
        if (skillSeq.length > path.length) return false;
        
        // 使用KMP算法的思想优化连续子序列搜索
        // 为了简化，这里使用一种更直接的方法，但比暴力搜索更快
        
        const firstElement = skillSeq[0];
        // 只检查可能的起始位置
        for (let i = 0; i <= path.length - skillSeq.length; i++) {
            // 只有当开始元素匹配时才进行完整匹配
            if (path[i] === firstElement) {
                let match = true;
                
                // 使用直接索引比较代替每次迭代的数组切片
                for (let j = 0; j < skillSeq.length; j++) {
                    if (path[i + j] !== skillSeq[j]) {
                        match = false;
                        break;
                    }
                }
                
                if (match) return true;
            }
        }
        
        return false;
    }
    
    // 检查特定功法是否被路径激活
    isSkillActivated(skillSequence, pathTypes) {
        return this.canActivateSkillConsecutively(skillSequence, pathTypes);
    }
    
    // 计算路径中重复节点数量 (优化版)
    countRepeatedNodes(path) {
        // 使用Map而不是Set来计数，更高效
        const uniquePoints = new Map();
        let duplicates = 0;
        
        for (const point of path) {
            const count = (uniquePoints.get(point) || 0) + 1;
            uniquePoints.set(point, count);
            if (count === 2) { // 只在第二次出现时计数，避免多次计数
                duplicates++;
            }
        }
        
        return duplicates;
    }
    
    // 优化版本的mergePathsGreedy方法，使用Python代码的思路
    optimizedGreedyPathFinder(skillsSequences) {
        // 初始化缓存，用于存储计算过的重叠结果
        const overlapCache = new Map();
        
        // 辅助函数：获取重叠值（带缓存）
        const getOverlap = (aIdx, bIdx) => {
            const cacheKey = `${aIdx},${bIdx}`;
            if (overlapCache.has(cacheKey)) {
                return overlapCache.get(cacheKey);
            }
            
            const a = skillsSequences[aIdx].sequence;
            const b = skillsSequences[bIdx].sequence;
            const maxPossible = Math.min(a.length, b.length);
            
            // 从最大可能的重叠开始检查
            for (let j = maxPossible; j > 0; j--) {
                // 检查a的末尾j个元素是否与b的开头j个元素匹配
                let match = true;
                for (let k = 0; k < j; k++) {
                    if (a[a.length - j + k] !== b[k]) {
                        match = false;
                        break;
                    }
                }
                
                if (match) {
                    overlapCache.set(cacheKey, j);
                    return j;
                }
            }
            
            overlapCache.set(cacheKey, 0);
            return 0;
        };
        
        const n = skillsSequences.length;
        if (n === 0) return [];
        if (n === 1) return skillsSequences[0].sequence;
        
        // 记录开始时间以便性能分析
        const startTime = performance.now();
        
        // 初始化
        const remaining = new Set(Array.from({length: n}, (_, i) => i));
        const path = [];
        let totalOverlap = 0;
        
        // 首先选择与其他序列有最大重叠的序列
        const overlapCounts = Array.from(remaining).map(i => {
            let sum = 0;
            for (const j of remaining) {
                if (i !== j) {
                    sum += getOverlap(i, j);
                }
            }
            return sum;
        });
        
        // 选择初始序列
        let current = Array.from(remaining).reduce((maxIdx, idx) => 
            overlapCounts[idx] > overlapCounts[maxIdx] ? idx : maxIdx, 
            Array.from(remaining)[0]
        );
        
        remaining.delete(current);
        path.push(current);
        
        // 贪婪算法：不断选择与当前路径末尾有最大重叠的下一个序列
        while (remaining.size > 0) {
            let bestNext = -1;
            let maxOverlap = -1;
            
            // 尝试找到与当前序列有最大重叠的下一个序列
            for (const candidate of remaining) {
                const overlap = getOverlap(current, candidate);
                if (overlap > maxOverlap) {
                    maxOverlap = overlap;
                    bestNext = candidate;
                }
            }
            
            // 如果没有找到好的重叠，选择与剩余序列有最大总重叠的序列
            if (bestNext === -1 || maxOverlap === 0) {
                let bestSum = -1;
                let bestIdx = -1;
                
                for (const idx of remaining) {
                    let sum = 0;
                    for (const j of remaining) {
                        if (idx !== j) {
                            sum += getOverlap(idx, j);
                        }
                    }
                    
                    if (bestIdx === -1 || sum > bestSum) {
                        bestSum = sum;
                        bestIdx = idx;
                    }
                }
                
                bestNext = bestIdx !== -1 ? bestIdx : Array.from(remaining)[0];
                maxOverlap = 0;
            }
            
            totalOverlap += maxOverlap;
            path.push(bestNext);
            remaining.delete(bestNext);
            current = bestNext;
        }
        
        // 计算处理时间
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        if (processingTime > 500) {
            console.info(`优化路径计算耗时: ${(processingTime/1000).toFixed(2)}秒`);
        }
        
        // 构建最终路径，考虑重叠部分
        let finalPath = [];
        for (let i = 0; i < path.length; i++) {
            const skillIdx = path[i];
            const skillSequence = skillsSequences[skillIdx].sequence;
            
            if (i === 0) {
                // 第一个功法直接添加
                finalPath = [...skillSequence];
            } else {
                // 获取与前一个功法的重叠长度
                const prevSkillIdx = path[i-1];
                const overlap = getOverlap(prevSkillIdx, skillIdx);
                
                // 只添加不重叠的部分
                if (overlap > 0) {
                    finalPath = finalPath.concat(skillSequence.slice(overlap));
                } else {
                    finalPath = finalPath.concat(skillSequence);
                }
            }
        }
        
        return {
            path: finalPath,
            pathIndices: path,
            totalOverlap: totalOverlap,
            processingTime: processingTime
        };
    }
}

// 全局经脉系统实例
let meridianSystem = new MeridianSystem();

// 添加单个功法
function addSkill() {
    const nameInput = document.getElementById('skill-name-input');
    const sequenceInput = document.getElementById('skill-sequence-input');
    
    const name = nameInput.value.trim();
    const sequenceText = sequenceInput.value.trim();
    
    if (!name) {
        alert('请输入功法名称');
        return;
    }
    
    if (!sequenceText) {
        alert('请输入穴位序列');
        return;
    }
    
    // 解析穴位序列 - 允许任意数字编号
    const sequence = sequenceText.split(',').map(s => {
        const num = parseInt(s.trim());
        if (isNaN(num)) {
            return 0; // 默认为0
        }
        return num;
    });
    
    // 添加到功法列表
    const skill = {
        name: name,
        sequence: sequence
    };
    
    skills.push(skill);
    
    // 清空输入
    nameInput.value = '';
    sequenceInput.value = '';
    
    // 更新功法显示
    updateSkillsDisplay();
}

// 导入多个功法
function importSkills() {
    const input = document.getElementById('importData').value;
    if (!input.trim()) {
        alert('请输入要导入的数据');
        return;
    }
    
    const lines = input.split('\n').filter(l => l.trim() !== '');
    let successCount = 0;
    let errorLines = [];

    lines.forEach(line => {
        const match = line.match(/^(.+?):\s*\[([\d,\s]+)\]$/);
        if (match) {
            const name = match[1].trim();
            const sequence = match[2].split(',').map(s => {
                const num = parseInt(s.trim());
                return isNaN(num) ? 0 : num;
            });
            
            // 不再验证穴位范围，允许任意数字编号
            skills.push({
                name: name,
                sequence: sequence
            });
            successCount++;
        } else {
            errorLines.push(line);
        }
    });

    // 清空导入数据文本框
    document.getElementById('importData').value = '';

    let message = `成功导入 ${successCount} 个功法`;
    if (errorLines.length > 0) {
        message += `，以下行格式错误：\n${errorLines.join('\n')}`;
    }
    alert(message);
    
    // 更新功法显示
    updateSkillsDisplay();
}

// 更新功法显示区域
function updateSkillsDisplay() {
    const skillsDisplay = document.getElementById('skills-display');
    
    if (skills.length === 0) {
        skillsDisplay.innerHTML = '<div class="alert alert-secondary h-100">尚未添加任何功法</div>';
        return;
    }
    
    let html = '';
    
    // 使用自定义响应式布局
    skills.forEach((skill, index) => {
        // 构建穴位图标序列
        let sequenceHtml = '';
        skill.sequence.forEach(type => {
            sequenceHtml += `<span class="acupoint-number">${type}</span>`;
        });
        
        // 找出功法在路径中的位置（如果有路径的话）
        let positionInfo = '';
        if (meridianSystem.optimalPath && meridianSystem.optimalPath.length > 0) {
            const startIndex = findSkillStartIndex(skill.sequence, meridianSystem.optimalPath);
            if (startIndex >= 0) {
                positionInfo = `<small class="text-success">(位置: ${startIndex+1}-${startIndex+skill.sequence.length})</small>`;
            }
        }
        
        // 使用自定义响应式布局类
        html += `
            <div class="skill-card-col">
                <div class="skill-card" data-index="${index}">
                    <input type="checkbox" class="skill-checkbox form-check-input" checked>
                    <div class="skill-info">
                        <div class="skill-name">${skill.name} ${positionInfo}</div>
                        <div class="skill-sequence">${sequenceHtml}</div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger delete-skill-btn" 
                        onclick="deleteSkill(${index})">删除</button>
                </div>
            </div>
        `;
    });
    
    skillsDisplay.innerHTML = html;
    
    // 确保即使功法很少，滚动条也能正常工作
    if (skills.length <= 4) {
        skillsDisplay.style.minHeight = '280px';
    } else {
        skillsDisplay.style.minHeight = '';
    }
}

// 查找功法序列在路径中的起始位置
function findSkillStartIndex(skillSeq, path) {
    for (let i = 0; i <= path.length - skillSeq.length; i++) {
        let match = true;
        for (let j = 0; j < skillSeq.length; j++) {
            if (path[i + j] !== skillSeq[j]) {
                match = false;
                break;
            }
        }
        if (match) return i;
    }
    return -1;
}

// 删除功法
function deleteSkill(index) {
    if (index >= 0 && index < skills.length) {
        skills.splice(index, 1);
        updateSkillsDisplay();
    }
}

// 清空所有功法
function clearSkills() {
    if (confirm('确定要清空所有功法吗？')) {
        skills = [];
        updateSkillsDisplay();
    }
}

// 计算最优路径
function calculateOptimalPath() {
    // 获取所有选中的功法
    const selectedSkills = [];
    const skillCards = document.querySelectorAll('.skill-card');
    
    skillCards.forEach(card => {
        const checkbox = card.querySelector('.skill-checkbox');
        if (checkbox && checkbox.checked) {
            const index = parseInt(card.getAttribute('data-index'));
            if (index >= 0 && index < skills.length) {
                selectedSkills.push(skills[index]);
            }
        }
    });
    
    if (selectedSkills.length === 0) {
        document.getElementById('meridian-display').innerHTML = 
            '<div class="alert alert-warning">请至少选择一个功法进行计算</div>';
        return;
    }
    
    // 显示计算提示
    const resultElement = document.getElementById('meridian-display');
    resultElement.innerHTML = 
        `<div class="alert alert-info">
            <div class="d-flex align-items-center">
                <strong>正在计算中...</strong>
                <div class="spinner-border ms-auto" role="status" aria-hidden="true"></div>
            </div>
            <div class="mt-2 small">处理 ${selectedSkills.length} 个功法，这可能需要一些时间</div>
         </div>`;
    
    // 使用setTimeout异步计算，避免界面卡死
    setTimeout(() => {
        try {
            // 设置计算超时保护
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("计算超时")), 20000); // 20秒超时
            });
            
            // 实际计算逻辑
            const calculationPromise = new Promise(resolve => {
                // 计算最优路径
                const result = meridianSystem.findOptimalPath(selectedSkills);
                resolve(result);
            });
            
            // 使用Promise.race竞赛模式，谁先完成就用谁的结果
            Promise.race([calculationPromise, timeoutPromise])
                .then(result => {
                    if (!result || !result.path || result.path.length === 0) {
                        resultElement.innerHTML = 
                            '<div class="alert alert-warning">未找到有效路径</div>';
                        return;
                    }
                    
                    // 使用新的整合后的显示结果方法
                    displayResult(result);
                })
                .catch(error => {
                    console.error("路径计算错误:", error);
                    
                    // 如果是超时，显示错误并建议减少功法数量
                    if (error.message === "计算超时") {
                        resultElement.innerHTML = `
                            <div class="alert alert-danger">
                                <h5>计算超时</h5>
                                <p>处理 ${selectedSkills.length} 个功法时计算量过大，请尝试以下解决方案：</p>
                                <ul>
                                    <li>减少选中的功法数量（建议一次不超过15个）</li>
                                    <li>选择穴位序列较短的功法</li>
                                    <li>尝试分批处理功法</li>
                                </ul>
                            </div>
                        `;
                    } else {
                        // 其他错误
                        resultElement.innerHTML = `
                            <div class="alert alert-danger">
                                <h5>计算出错</h5>
                                <p>${error.message}</p>
                            </div>
                        `;
                    }
                });
        } catch (e) {
            // 捕获同步错误
            console.error("计算过程中发生错误:", e);
            resultElement.innerHTML = `
                <div class="alert alert-danger">
                    <h5>计算过程中发生错误</h5>
                    <p>${e.message}</p>
                </div>
            `;
        }
    }, 100); // 给UI一个短暂的时间来更新
}

// 显示结果
function displayResult(result) {
    const activatedSkills = result.activated;
    const path = result.path;
    const activatedCount = activatedSkills.length;
    const totalSelected = document.querySelectorAll('.skill-checkbox:checked').length;
    
    // 更新穴位统计
    const repeatedNodes = result.repeatedNodes || 0;
    const totalNodes = path.length;
    const originalTotal = result.originalTotal || activatedSkills.reduce((sum, skill) => sum + skill.sequence.length, 0);
    
    // 可视化经脉路径 - 同步更新，包含优化结果显示
    visualizeMeridianPath(path, repeatedNodes, totalNodes, originalTotal, activatedCount, totalSelected);
}

// 简化后的可视化经脉路径
function visualizeMeridianPath(path, repeatedNodes, totalNodes, originalTotal, activatedCount, totalSelected) {
    const container = document.getElementById('meridian-display');
    
    if (!path || path.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">无法生成经脉路径</div>';
        return;
    }
    
    // 统计哪些穴位重复出现
    const nodeCounts = {};
    path.forEach((node) => {
        nodeCounts[node] = (nodeCounts[node] || 0) + 1;
    });
    
    // 创建完整的数字路径表示
    let pathNodesHtml = '';
    path.forEach((node, index) => {
        // 如果节点出现次数大于1，则标记为重复节点
        const isRepeated = nodeCounts[node] > 1;
        pathNodesHtml += `
            <div class="meridian-node ${isRepeated ? 'repeated-meridian-node' : ''}">
                <div class="node-number">${index+1}</div>
                <div class="node-value">${node}</div>
            </div>
            ${index < path.length - 1 ? '<div class="node-connector">→</div>' : ''}
        `;
    });
    
    // 创建完整的可视化，包含优化结果显示
    let html = `
        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title">经脉路径</h5>
                <div class="alert alert-success">
                    <strong>已找到最优路径!</strong> 激活了 ${activatedCount}/${totalSelected} 个功法，经脉 ${totalNodes}/${originalTotal}，优化穴位: ${repeatedNodes}
                </div>
                <div class="meridian-path-visualization">
                    <div class="meridian-path-nodes">
                        ${pathNodesHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // 更新技能列表，显示在路径中的位置
    updateSkillsDisplay();
}

// 导出所有功法数据
function exportSkills() {
    const dataStr = skills.map(skill => 
        `${skill.name}:[${skill.sequence.join(',')}]`
    ).join('\n');
    
    const blob = new Blob([dataStr], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '内功功法数据.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 初始化事件监听
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== 初始化开始 ===');
    
    // 绑定按钮事件
    document.getElementById('add-skill-btn').addEventListener('click', addSkill);
    document.getElementById('import-skills-btn').addEventListener('click', importSkills);
    document.getElementById('calculate-btn').addEventListener('click', calculateOptimalPath);
    document.getElementById('clear-skills-btn').addEventListener('click', clearSkills);
    
    // 初始化显示
    updateSkillsDisplay();
    
    console.log('=== 初始化完成 ===');
});