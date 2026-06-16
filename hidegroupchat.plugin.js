/**
 * @name HideGroupChats
 * @author Kayed Mankal
 * @description Allows users to hide group chats from the DM list
 * @version 0.0.1
 * @source https://github.com/kayedm/hide-group-chats
 */

let dmList = [];
let hiddenDmList = [];

/**
 * Gets a list of group DMs
 */
function getGroupChats() {
    // Populates the DM list with group chat subtext elements
    dmList = Array.from(document.querySelectorAll("div.subtext__972a0"));

    // Changes the selected element to the top-most element so the entire group chat gets hidden
    if (!dmList.length == 0) {
        for (let i = 0; i < dmList.length; i++) {
            dmList[i] = dmList[i].closest("li");
        }
    }
}

/**
 * Replaces a group chat's x button functionality to hide the group instead of leaving it
 */
function addListeners() {

    // Attaches an event listener to group chat close buttons and hides the group chat when pressed
    dmList.forEach(dm => {

        if (dm.dataset.hasListener) {
            return;
        }

        const dmId = dm.querySelector("a").getAttribute("href").split("/").pop();
        const rule = `li:has(a[href="/channels/@me/${dmId}"]) { display: none !important; }`;
        const styleid = `hgc-${dmId}`;

        const xButton = dm.querySelector("div.iconsContainer__972a0");

        const handler = (e) => {
            e.stopPropagation();
            BdApi.DOM.addStyle(styleid, rule);
            hiddenDmList.push(dmId);
        };

        xButton.addEventListener("click", handler)
        xButton.hideHandler = handler;

        dm.dataset.hasListener = 'true';
    });
}

/**
 * Hides a given list of chat DM's IDs
 * @param groupchats The list of group DMs IDs to hide
 */
function hideGroupChats(groupchats) {
    groupchats.forEach(dmId => {
        const rule = `li:has(a[href="/channels/@me/${dmId}"]) { display: none !important; }`;
        const styleid = `hgc-${dmId}`;
        BdApi.DOM.addStyle(styleid, rule);
    });
}

module.exports = () => ({
    start() {

        // Load saved DMs and hide them
        hiddenDmList = BdApi.Data.load("HideGroupChats", "hidelist") ?? [];
        hideGroupChats(hiddenDmList);

        // Gets a list of all group chats from the DM list
        getGroupChats();
        // Adds listeners to the x button on the group chats and hides them when pressed
        addListeners();

        // Finds the module that runs when transitioning to a new group chat
        const [RouterModule, routerKey] = BdApi.Webpack.getWithKey(
            m => m?.toString?.()?.includes("transitionTo -"),
            { searchExports: true }
        );

        // Patches the module to extract the group chat id and unhide it from the DM list when opened
        BdApi.Patcher.before("HideGroupChats", RouterModule, routerKey, (thisObject, args) => {
            const path = args[0];
            const channelId = path?.split("/").pop();
            if (hiddenDmList.includes(channelId)) {
                BdApi.DOM.removeStyle(`hgc-${channelId}`);
                hiddenDmList = hiddenDmList.filter(id => id !== channelId);
            }
        });
    },

    stop() {

        // Save hidden DMs to storage
        BdApi.Data.save("HideGroupChats", "hidelist", hiddenDmList);

        // Unhides all group chats
        hiddenDmList.forEach(dmId => {
            const styleid = `hgc-${dmId}`;
            BdApi.DOM.removeStyle(styleid);
        });

        // Removes listeners from the xButton element
        dmList.forEach(dm => {
            const xButton = dm.querySelector("div.iconsContainer__972a0");
            xButton.removeEventListener("click", xButton.hideHandler);
            delete dm.dataset.hasListener;
        });

        // Clear global variables
        dmList = [];
        hiddenDmList = [];

    },

    onSwitch() {

        // View changes remove hidden styles and listeners, so they must be reapplied
        getGroupChats();
        // Re add the listeners
        addListeners();
        // Re hide the group chats
        hideGroupChats(hiddenDmList);

    }
});
