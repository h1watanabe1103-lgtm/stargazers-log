const repositoryList = document.querySelector("#repository-list");
const repositoryCount = document.querySelector("#repository-count");

function renderRepositories(repositories) {
  repositoryList.replaceChildren();

  repositories.forEach((repository) => {
    const item = document.createElement("li");
    item.className = "repository-item";

    const heading = document.createElement("h3");
    const link = document.createElement("a");
    link.href = repository.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = repository.repository;
    heading.append(link);

    const description = document.createElement("p");
    description.className = "repository-description";
    description.textContent = repository.description;

    const starredAt = document.createElement("time");
    starredAt.className = "starred-at";
    starredAt.dateTime = repository.starred_at;
    starredAt.textContent = `Starred ${new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(new Date(`${repository.starred_at}T00:00:00`))}`;

    item.append(heading, description, starredAt);
    repositoryList.append(item);
  });

  repositoryCount.textContent = `${repositories.length} ${repositories.length === 1 ? "repository" : "repositories"}`;
}

fetch("events.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
  })
  .then((repositories) => {
    if (!Array.isArray(repositories)) {
      throw new Error("Expected a list of repositories");
    }
    renderRepositories(repositories);
  })
  .catch(() => {
    repositoryCount.textContent = "Unavailable";
    const message = document.createElement("li");
    message.className = "repository-item error-message";
    message.textContent = "Could not load the starred repositories.";
    repositoryList.replaceChildren(message);
  });