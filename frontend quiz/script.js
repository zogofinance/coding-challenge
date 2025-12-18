const initializationState = {
  desktop: false,
  processing: false,
};

const messageStats = {
  AUTH_TOKEN_PROCESSED: 0,
  total: 0,
  byType: {},
};

function getURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const params = {};

  for (const [key, value] of urlParams) {
    params[key] = value;
  }

  return params;
}

function saveParametersToStorage(params) {
  if (Object.keys(params).length > 0) {
    localStorage.setItem("zogoUrlParams", JSON.stringify(params));
    console.log("Parameters saved to localStorage:", params);
  }
}

function loadParametersFromStorage() {
  const stored = localStorage.getItem("zogoUrlParams");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing stored parameters:", e);
      return null;
    }
  }
  return null;
}

function clearStoredParams() {
  localStorage.removeItem("zogoUrlParams");
  window.location.href = window.location.pathname;
}

function determineFlowType(deepLinkModuleId, skillId) {
  if (deepLinkModuleId) {
    return "Deep Link Flow (Module)";
  } else if (skillId) {
    return "Deep Link Flow (Skill)";
  } else {
    return "Full Experience Flow";
  }
}

function processURLParameters() {
  if (initializationState.processing) {
    console.log("Already processing parameters, skipping...");
    return;
  }

  initializationState.processing = true;

  let params = getURLParameters();
  let isFromStorage = false;

  if (Object.keys(params).length === 0) {
    const storedParams = loadParametersFromStorage();
    if (storedParams) {
      params = storedParams;
      isFromStorage = true;
      console.log("Loaded parameters from localStorage:", params);
    }
  } else {
    saveParametersToStorage(params);
  }

  const userId = params["id"];
  const deepLinkModuleId = params["deep_link_module_id"];
  const skillId = params["skill_id"];
  const locale = params["locale"];

  if (userId !== undefined) {
    const flowType = determineFlowType(deepLinkModuleId, skillId);

    window.urlParameters = {
      userId: userId,
      deepLinkModuleId: deepLinkModuleId || null,
      skillId: skillId || null,
      locale: locale || "en_US",
      flowType: flowType,
      isDeepLink: !!(deepLinkModuleId || skillId),
      allParams: params,
      isFromStorage: isFromStorage,
    };

    console.log("URL Parameters processed:", window.urlParameters);

    createOrUpdateUser(userId, locale);
  } else {
    initializationState.processing = false;
  }
}

async function createOrUpdateUser(userId, locale) {
  const apiUrl = "https://api.zogo.com/sdk/user";
  const api_id = "Vi3vsMFv";
  const api_secret = "4VVNcd9F";

  const midpoint = Math.ceil(userId.length / 2);
  const firstName = userId.substring(0, midpoint);
  const lastName = userId.substring(midpoint);

  const userInfo = {
    external_id: userId,
    display_name: userId,
    first_name: firstName,
    last_name: lastName,
    email: "liamedlinger@gmail.com",
    is_test_user: false,
  };

  if (locale) {
    userInfo.locale = locale;
  }

  const requestBody = {
    auth: {
      type: "token",
    },
    user_info: userInfo,
  };

  try {
    console.log("Making API request to:", apiUrl);
    console.log("Request body:", requestBody);

    const credentials = btoa(`${api_id}:${api_secret}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log("User created/updated successfully:", responseData);

      if (responseData.token) {
        window.zogoAuthToken = responseData.token;
        console.log("Token saved in window.zogoAuthToken:", responseData.token);

        const deepLinkModuleId = window.urlParameters?.deepLinkModuleId;
        const skillId = window.urlParameters?.skillId;
        initializeZogo360(responseData.token, deepLinkModuleId, skillId);
      }
    } else {
      console.error("API request failed:", response.status, responseData);
    }
  } catch (error) {
    console.error("Error making API request:", error);
  }
}

async function initializeZogo360(token, deepLinkModuleId, skillId) {
  if (initializationState.desktop) {
    console.log("Desktop Zogo 360 already initialized, skipping...");
    return;
  }

  try {
    console.log("Initializing Zogo 360 component with token:", token);

    const zogoComponent = document.getElementById("zogo-component");

    if (!zogoComponent) {
      console.error("Zogo component not found");
      return;
    }

    if (
      zogoComponent.initialized ||
      zogoComponent.getAttribute("data-initialized") === "true"
    ) {
      console.log("Desktop component already initialized, skipping...");
      initializationState.desktop = true;
      return;
    }

    if (zogoComponent._initializationSent) {
      console.warn(
        "Initialization already sent to this component, skipping duplicate call"
      );
      return;
    }

    zogoComponent._initializationSent = true;

    const initConfig = {
      user_auth_token: token,
    };

    if (deepLinkModuleId) {
      initConfig.widget_type = "deep_link";
      initConfig.module_id = parseInt(deepLinkModuleId, 10);
      console.log("Using deep link module ID:", deepLinkModuleId);
    } else if (skillId) {
      initConfig.widget_type = "deep_link";
      initConfig.skill_id = parseInt(skillId, 10);
      console.log("Using deep link skill ID:", skillId);
    } else {
      initConfig.widget_type = null;
      initConfig.module_id = null;
    }

    console.log("Calling zogoComponent.initialize() with config:", {
      user_auth_token: token.substring(0, 20) + "...",
      widget_type: initConfig.widget_type,
      module_id: initConfig.module_id,
      skill_id: initConfig.skill_id,
    });

    await zogoComponent.initialize(initConfig);

    initializationState.desktop = true;
    zogoComponent.setAttribute("data-initialized", "true");

    console.log("zogoComponent.initialize() completed successfully");

    zogoComponent.addEventListener("zogo360:initialized", (e) => {
      console.log("Zogo 360 initialized event:", e.detail);
    });

    zogoComponent.addEventListener("openurl", (e) => {
      console.log("URL request:", e.detail);
      window.open(e.detail.url, "_blank");
    });

    zogoComponent.addEventListener("message", (e) => {
      const messageType = e.detail?.type || "unknown";
      messageStats.total++;
      messageStats.byType[messageType] =
        (messageStats.byType[messageType] || 0) + 1;

      if (messageType === "AUTH_TOKEN_PROCESSED") {
        messageStats.AUTH_TOKEN_PROCESSED++;
        console.warn(
          `AUTH_TOKEN_PROCESSED message #${messageStats.AUTH_TOKEN_PROCESSED}:`,
          e.detail
        );
      }

      if (messageType === "EXIT_REQUESTED") {
        console.log("Desktop: Deep link flow exit detected:", e.detail);
        console.log("Event target:", e.target);
        console.log("Event currentTarget:", e.currentTarget);
        alert("Desktop: Deep link flow complete!");
      }

      console.log(
        `[Message ${messageStats.total}] Type: ${messageType}`,
        e.detail
      );
    });

    setInterval(() => {
      if (messageStats.total > 0) {
      }
    }, 5000);
  } catch (error) {
    console.error("Failed to initialize Zogo 360:", error);
    alert(
      "Failed to initialize Zogo 360 component. Check console for details."
    );
  } finally {
    initializationState.processing = false;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded - Processing URL parameters");
  processURLParameters();
});

window.addEventListener("popstate", (event) => {
  console.log("Popstate event fired", event);
  if (!initializationState.desktop) {
    processURLParameters();
  }
});

window.resetZogoInitialization = function () {
  console.log("Resetting Zogo initialization state");
  initializationState.desktop = false;
  initializationState.processing = false;

  const desktopComponent = document.getElementById("zogo-component");

  if (desktopComponent) {
    desktopComponent.removeAttribute("data-initialized");
    desktopComponent._initializationSent = false;
  }

  messageStats.AUTH_TOKEN_PROCESSED = 0;
  messageStats.total = 0;
  messageStats.byType = {};
};

window.getMessageStats = function () {
  return messageStats;
};
