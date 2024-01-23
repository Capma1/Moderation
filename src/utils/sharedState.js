let debugMode = false;
let highlightCoolDown = new Map(); // This will store cooldowns in the format of a composite key: "userID:phrase"

module.exports = {
    getDebugMode: function () {
        return debugMode;
    },
    setDebugMode: function (newValue) {
        debugMode = newValue;
    },
    // Check if a specific highlight for a user is on cooldown
    isHighlightOnCoolDown: function (userID, phrase) {
        const key = `${userID}:${phrase}`;
        if (!highlightCoolDown.has(key)) {
            return false; // Not on cooldown
        }

        const expirationTime = highlightCoolDown.get(key);
        if (Date.now() > expirationTime) {
            highlightCoolDown.delete(key); // Cooldown expired, remove it
            return false; // Not on cooldown anymore
        }

        return true; // Still on cooldown
    },
    // Add a highlight cooldown for a user
    addHighlightCoolDown: function (userID, phrase, duration) {
        const key = `${userID}:${phrase}`;
        const expirationTime = Date.now() + duration * 60000; // convert duration from minutes to milliseconds
        highlightCoolDown.set(key, expirationTime);
    },
};
