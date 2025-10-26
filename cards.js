class DivinationCardIndex {
    constructor() {
        this.cards = [];
        this.currentSort = { column: null, direction: 'asc' };
        this.editingCardId = null;
        this.currentVersion = '3.26';
        
        this.initializeEventListeners();
        this.initializeSelectElement();
        this.loadData();
        this.updateVersionDisplay();
        this.renderTable();
        
    }

    initializeSelectElement() {
        const selectElement = document.getElementById('leagueSelect');
        if (selectElement) {
            selectElement.value = this.currentVersion;
            this.updateTextOverlay();
        }
    }


    forceUpdateSelectDisplay() {
        const selectElement = document.getElementById('leagueSelect');
        if (selectElement) {
            selectElement.style.color = '#FFFFFF';
            selectElement.style.textShadow = '0 0 2px rgba(255, 255, 255, 0.5)';
            selectElement.offsetHeight;
        }
    }

    getVersionDisplayText(version) {
        const versionMap = {
            '3.26': '3.26 - Mercenary',
            '3.27': '3.27 - Keepers of the Flame'
        };
        return versionMap[version] || '3.26 - Mercenary';
    }

    updateTextOverlay() {
        const textElement = document.getElementById('leagueSelectText');
        if (textElement) {
            const displayText = this.getVersionDisplayText(this.currentVersion);
            textElement.textContent = displayText;
        }
    }



    initializeEventListeners() {
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterCards(e.target.value);
        });

        document.getElementById('addCardBtn').addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('reloadDataBtn').addEventListener('click', () => {
            this.clearCache();
            this.loadFromVersionJSON(false);
            alert('Data reloaded from JSON files!');
        });

        document.getElementById('exportJsonBtn').addEventListener('click', () => {
            this.exportToJSON();
        });

        document.getElementById('calculatorBtn').addEventListener('click', () => {
            window.location.href = 'calculator.html';
        });

        document.getElementById('leagueSelect').addEventListener('change', (e) => {
            this.currentVersion = e.target.value;
            
            this.updateVersionDisplay();
            this.loadFromVersionJSON();
        });

        document.getElementById('cardForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCard();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('cardModal');
            const modalContent = document.querySelector('.modal-content');
            
            if (e.target === modal && !modalContent.contains(e.target)) {
                this.closeModal();
            }
        });

        document.getElementById('cardGoldCost').addEventListener('input', (e) => {
            const goldCost = parseFloat(e.target.value);
            if (goldCost > 0) {
                const tempCard = { goldCost: goldCost };
                const calculatedWeight = this.calculateWeight(tempCard);
                document.getElementById('cardWeight').value = calculatedWeight;
            } else {
                document.getElementById('cardWeight').value = '';
            }
        });

        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const column = e.currentTarget.dataset.column;
                this.sortCards(column);
            });
        });
    }

    calculateWeight(card) {
        if (!card.goldCost || card.goldCost <= 0) {
            return this.calculateWeightLegacy(card);
        }
        
        const baseGoldCost = parseFloat(card.goldCost);
        
        if (baseGoldCost < 125) {
            const finalWeight = 1000000 / baseGoldCost;
            return Math.round(finalWeight * 100) / 100;
        } else {
            const input1 = baseGoldCost;
            const input2 = baseGoldCost + 24.99;
            
            const weight1 = 13000000000 / Math.pow(input1, 3);
            const weight2 = 13000000000 / Math.pow(input2, 3);
            
            const finalWeight = (weight1 + weight2) / 2;
            
            return Math.round(finalWeight * 100) / 100;
        }
    }

    calculateWeightLegacy(card) {
        let weight = 1.0;
        
        weight *= (1 / Math.log(card.stackSize + 1));
        
        const reward = card.reward.toLowerCase();
        if (reward.includes('unique') || reward.includes('rare')) {
            weight *= 0.5;
        } else if (reward.includes('currency') || reward.includes('orb')) {
            weight *= 0.8;
        } else if (reward.includes('gem') || reward.includes('skill')) {
            weight *= 0.9;
        }
        
        const location = card.dropLocation.toLowerCase();
        if (location.includes('boss') || location.includes('uber')) {
            weight *= 0.3;
        } else if (location.includes('map') || location.includes('tier')) {
            weight *= 0.6;
        }
        
        return Math.round(weight * 100) / 100;
    }

    loadData() {
        this.loadFromVersionJSON();
    }

    loadFromVersionJSON(loadCache = true) {
        const fileName = this.getVersionFileName(this.currentVersion);
        fetch(`data/${fileName}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`${fileName} not found`);
                }
                return response.json();
            })
            .then(jsonData => {
                if (jsonData.version) {
                } else {
                }
                
                const selectElement = document.getElementById('leagueSelect');
                selectElement.value = this.currentVersion;
                
                this.updateTextOverlay();
                
                if (jsonData.cards && Array.isArray(jsonData.cards)) {
                    this.cards = jsonData.cards;
                    
                    if (loadCache) {
                        this.loadCachedModifications();
                    }
                    
                    this.renderTable();
                } else {
                    throw new Error('Invalid JSON format: Cards array not found');
                }
            })
            .catch(error => {
                console.error(`Error loading ${fileName}:`, error);
                this.cards = [];
            });
    }

    getVersionFileName(version) {
        const versionMap = {
            '3.26': '3.26mercenary.json',
            '3.27': '3.27keepers.json'
        };
        const fileName = versionMap[version] || '3.26mercenary.json';
        return fileName;
    }

    loadFromCardsCSV() {
        fetch('Cards.csv')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Cards.csv not found');
                }
                return response.text();
            })
            .then(csvContent => {
                this.parseCardsCSV(csvContent);
            })
            .catch(error => {
                console.error('Error loading Cards.csv:', error);
                this.cards = [];
            });
    }

    parseCardsCSV(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const idIndex = headers.findIndex(h => h.includes('id') || h.includes('card'));
        const nameIndex = headers.findIndex(h => h.includes('name'));

        if (idIndex === -1 || nameIndex === -1) {
            throw new Error('CSV must contain "Card ID" and "Name" columns');
        }

        this.cards = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length >= Math.max(idIndex, nameIndex) + 1) {
                const id = parseInt(values[idIndex]);
                const name = values[nameIndex].trim();
                
                if (!isNaN(id) && name) {
                    this.cards.push({
                        id: id,
                        name: name,
                        reward: "Unknown reward",
                        stackSize: 1,
                        dropLocation: "Unknown location",
                        goldCost: 0,
                        weight: 0
                    });
                }
            }
        }

        this.cards.forEach(card => {
            card.weight = this.calculateWeight(card);
        });
    }

    saveToLocalStorage() {
        const dataToSave = {
            version: this.currentVersion,
            exportDate: new Date().toISOString(),
            cards: this.cards
        };
        
        try {
            localStorage.setItem('divinationCards', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    saveToJSONFile() {
        const fileName = this.getVersionFileName(this.currentVersion);
        const jsonData = {
            version: this.currentVersion,
            exportDate: new Date().toISOString(),
            cards: this.cards
        };

        const jsonContent = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        
        alert(`Updated ${fileName} has been downloaded! Replace the file in the data folder to save changes permanently.`);
    }

    loadCachedModifications() {
        const cacheKey = `divinationCards_cache_${this.currentVersion}`;
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
            try {
                const parsedCache = JSON.parse(cachedData);
                if (parsedCache.cards && Array.isArray(parsedCache.cards)) {
                    this.cards = parsedCache.cards;
                }
            } catch (error) {
                console.warn('Error loading cached modifications:', error);
            }
        }
    }

    saveToCache() {
        const cacheKey = `divinationCards_cache_${this.currentVersion}`;
        const dataToCache = {
            version: this.currentVersion,
            exportDate: new Date().toISOString(),
            cards: this.cards
        };
        
        try {
            localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
        } catch (error) {
            console.error('Error saving to cache:', error);
        }
    }

    clearCache() {
        const cacheKey = `divinationCards_cache_${this.currentVersion}`;
        localStorage.removeItem(cacheKey);
    }

    updateVersionDisplay() {
        const table = document.getElementById('cardTable');
        
        table.className = `card-table version-${this.currentVersion.replace('.', '-')}`;
        
        const dropLocationFields = document.querySelectorAll('.drop-location-field');
        const weightFields = document.querySelectorAll('.weight-field');
        const headers = document.querySelectorAll('.drop-location-header, .weight-header');
        
        dropLocationFields.forEach(field => field.style.display = 'block');
        weightFields.forEach(field => field.style.display = 'block');
        headers.forEach(header => header.style.display = '');
    }

    loadFromJSONFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                
                if (jsonData.version) {
                    this.currentVersion = jsonData.version;
                    document.getElementById('leagueSelect').value = jsonData.version;
                    this.updateVersionDisplay();
                }
                
                if (jsonData.cards && Array.isArray(jsonData.cards)) {
                    this.cards = jsonData.cards;
                    this.renderTable();
                    alert(`Successfully loaded ${this.cards.length} cards from ${file.name}`);
                } else {
                    alert('Invalid JSON format: Cards array not found');
                }
            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert('Error loading JSON file: ' + error.message);
            }
        };
        
        reader.onerror = () => {
            alert('Error reading file');
        };
        
        reader.readAsText(file);
    }

    renderTable() {
        const tbody = document.getElementById('cardTableBody');
        tbody.innerHTML = '';

        this.cards.forEach(card => {
            const row = document.createElement('tr');
            
            let rowHTML = `
                <td class="id-cell">${card.id}</td>
                <td>${card.name}</td>
                <td>${card.reward}</td>
                <td class="stack-size-cell">${card.stackSize}</td>
                <td class="drop-location-cell" title="${card.dropLocation}">${card.dropLocation}</td>
                <td class="weight-cell">${card.weight}</td>
            `;
            
            rowHTML += `
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-action-edit" onclick="app.editCard(${card.id})">Edit</button>
                        <button class="action-btn btn-action-delete" onclick="app.deleteCard(${card.id})">Delete</button>
                    </div>
                </td>
            `;
            
            row.innerHTML = rowHTML;
            tbody.appendChild(row);
        });
    }

    filterCards(searchTerm) {
        const filteredCards = this.cards.filter(card => 
            card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.reward.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.dropLocation.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderFilteredTable(filteredCards);
    }

    renderFilteredTable(cards) {
        const tbody = document.getElementById('cardTableBody');
        tbody.innerHTML = '';

        cards.forEach(card => {
            const row = document.createElement('tr');
            
            let rowHTML = `
                <td class="id-cell">${card.id}</td>
                <td>${card.name}</td>
                <td>${card.reward}</td>
                <td class="stack-size-cell">${card.stackSize}</td>
                <td class="drop-location-cell" title="${card.dropLocation}">${card.dropLocation}</td>
                <td class="weight-cell">${card.weight}</td>
            `;
            
            rowHTML += `
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-action-edit" onclick="app.editCard(${card.id})">Edit</button>
                        <button class="action-btn btn-action-delete" onclick="app.deleteCard(${card.id})">Delete</button>
                    </div>
                </td>
            `;
            
            row.innerHTML = rowHTML;
            tbody.appendChild(row);
        });
    }

    sortCards(column) {
        const direction = this.currentSort.column === column && this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        
        this.cards.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];
            
            if (column === 'stackSize' || column === 'weight') {
                aVal = parseFloat(aVal);
                bVal = parseFloat(bVal);
            } else {
                aVal = aVal.toString().toLowerCase();
                bVal = bVal.toString().toLowerCase();
            }
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        this.currentSort = { column, direction };
        this.updateSortHeaders();
        this.renderTable();
    }

    updateSortHeaders() {
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('asc', 'desc');
            if (header.dataset.column === this.currentSort.column) {
                header.classList.add(this.currentSort.direction);
            }
        });
    }

    openModal(card = null) {
        const modal = document.getElementById('cardModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('cardForm');
        
        this.updateVersionDisplay();
        
        if (card) {
            modalTitle.textContent = 'Edit Card';
            document.getElementById('cardId').value = card.id;
            document.getElementById('cardName').value = card.name;
            document.getElementById('cardReward').value = card.reward;
            document.getElementById('cardStackSize').value = card.stackSize;
            
            const dropLocationInput = document.getElementById('cardDropLocation');
            const goldCostInput = document.getElementById('cardGoldCost');
            const weightInput = document.getElementById('cardWeight');
            
            if (dropLocationInput) dropLocationInput.value = card.dropLocation;
            if (goldCostInput) goldCostInput.value = card.goldCost || '';
            if (weightInput) weightInput.value = card.weight;
            
            this.editingCardId = card.id;
        } else {
            modalTitle.textContent = 'Add New Card';
            form.reset();
            const maxId = Math.max(...this.cards.map(c => c.id), 0);
            document.getElementById('cardId').value = maxId + 1;
            this.editingCardId = null;
        }
        
        modal.style.display = 'block';
    }

    closeModal(forceClose = false) {
        if (!forceClose) {
            const hasChanges = this.hasUnsavedChanges();
            if (hasChanges) {
                const confirmClose = confirm('You have unsaved changes. Are you sure you want to close without saving?');
                if (!confirmClose) {
                    return;
                }
            }
        }
        
        document.getElementById('cardModal').style.display = 'none';
        document.getElementById('cardForm').reset();
        this.editingCardId = null;
    }

    hasUnsavedChanges() {
        const form = document.getElementById('cardForm');
        const inputs = form.querySelectorAll('input[type="text"], input[type="number"]');
        
        for (let input of inputs) {
            if (input.value.trim() !== '') {
                return true;
            }
        }
        
        return false;
    }

    saveCard() {
        const dropLocationInput = document.getElementById('cardDropLocation');
        const goldCostInput = document.getElementById('cardGoldCost');
        
        const formData = {
            id: parseInt(document.getElementById('cardId').value),
            name: document.getElementById('cardName').value,
            reward: document.getElementById('cardReward').value,
            stackSize: parseInt(document.getElementById('cardStackSize').value),
            dropLocation: dropLocationInput ? dropLocationInput.value : '',
            goldCost: goldCostInput ? (parseFloat(goldCostInput.value) || 0) : 0,
            weight: 0
        };

        const existingCard = this.cards.find(card => card.id === formData.id && card.id !== this.editingCardId);
        if (existingCard) {
            alert(`Card ID ${formData.id} already exists. Please choose a different ID.`);
            return;
        }

        if (this.editingCardId) {
            const cardIndex = this.cards.findIndex(card => card.id === this.editingCardId);
            if (cardIndex !== -1) {
                this.cards[cardIndex] = { ...this.cards[cardIndex], ...formData };
                this.cards[cardIndex].weight = this.calculateWeight(this.cards[cardIndex]);
            }
        } else {
            const newCard = { ...formData };
            
            newCard.weight = this.calculateWeight(newCard);
            
            this.cards.push(newCard);
        }

        this.closeModal(true);
        this.saveToCache();
        this.renderTable();
    }

    editCard(cardId) {
        const card = this.cards.find(c => c.id === cardId);
        if (card) {
            this.openModal(card);
        }
    }

    deleteCard(cardId) {
        if (confirm('Are you sure you want to delete this card?')) {
            this.cards = this.cards.filter(card => card.id !== cardId);
            this.saveToCache();
            this.renderTable();
        }
    }

    exportToJSON() {
        const jsonData = {
            version: this.currentVersion,
            exportDate: new Date().toISOString(),
            cards: this.cards
        };

        const jsonContent = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `divination_cards_v${this.currentVersion}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    }


    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new DivinationCardIndex();
});