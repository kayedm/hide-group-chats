/**
 * @name HideGroupChats
 * @author Kayed Mankal
 * @description Allows users to hide group chats from the DM list
 * @version 0.0.1
 */

let dmList = [];
let hiddenDmList = [];

/**
 * Creates a list of elements corresponding to the group DMs, and replaces the x button functionality to hide
 * the group instead of leaving it
 */
function hideGroupChat() {

    // Populates the DM list with group chat subtext elements
    dmList = Array.from(document.querySelectorAll("div.subtext__972a0"));

    // Changes the selected element to the top-most element so the entire group chat gets hidden
    if (!dmList.length == 0) {
        for (let i = 0; i < dmList.length; i++) {
            dmList[i] = dmList[i].closest("li");
        }
    }

    // Attaches an event listener to group chat close button thats hides the group chat when pressed
    dmList.forEach(dm => {

        if (dm.dataset.hasListener) {
            return;
        }

        const dmId = dm.querySelector("a").getAttribute("href").split("/").pop();
        const rule = `li:has(a[href="/channels/@me/${dmId}"]) { display: none !important; }`;
        const styleid = `hgc-${dmId}`;

        if (hiddenDmList.includes(dmId)) {
            BdApi.DOM.addStyle(styleid, rule);
        }

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
 * Hides a given list of dm id's
 * @param groupchats The list of Dm's to hide
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

        // Loaded saved DMs and hide them
        hiddenDmList = BdApi.Data.load("HideGroupChats", "hidelist");
        hideGroupChats(hiddenDmList);

        hideGroupChat();

        // Finds the module that runs when transitioning to a new group chat
        const [RouterModule, routerKey] = BdApi.Webpack.getWithKey(
            m => m?.toString?.()?.includes("transitionTo -"),
            { searchExports: true }
        );

        // Patches the module to extract the group chat id and unhide it from the DM list before running
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

        hiddenDmList = [];
        dmList = [];

    },

    onSwitch() {

        // View changes remove the hidden styles, so they must be reapplied
        hideGroupChat();

    }
});
