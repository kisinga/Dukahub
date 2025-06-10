document.addEventListener("DOMContentLoaded", function () {
  // Model Modal Logic
  const modelModal = document.getElementById("modelModal");
  modelModal.addEventListener("show.bs.modal", function (event) {
    const button = event.relatedTarget;
    const companyName = button.getAttribute("data-company");
    const companyId = button.getAttribute("data-company-id");
    const modelStatus = button.getAttribute("data-status");
    const trainDate = button.getAttribute("data-train-date");
    const newItems = button.getAttribute("data-new-items");
    const newImages = button.getAttribute("data-new-images");
    const totalImages = button.getAttribute("data-total-images");

    modelModal.querySelector(".company-name").textContent = companyName;
    modelModal.querySelector("#modelStatus").textContent = modelStatus;
    modelModal.querySelector("#trainDate").textContent = trainDate;
    modelModal.querySelector("#newItems").textContent = newItems;
    modelModal.querySelector("#newImages").textContent = newImages;
    modelModal.querySelector("#totalImages").textContent = totalImages;

    const statusBadge = modelModal.querySelector("#modelStatus");
    statusBadge.className = "badge rounded-pill";
    if (modelStatus === "Trained") {
      statusBadge.classList.add("bg-success");
    } else if (modelStatus === "Untrained") {
      statusBadge.classList.add("bg-danger");
    } else {
      statusBadge.classList.add("bg-warning");
    }
  });

  // Create Company Form Submission
  const createCompanyForm = document.getElementById("createCompanyForm");
  if (createCompanyForm) {
    createCompanyForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const companyName = document.getElementById("createCompanyName").value;
      const companyLocation = document.getElementById(
        "createCompanyLocation"
      ).value;
      const companyPhone = document.getElementById("createCompanyPhone").value;
      const companyLogo = document.getElementById("createCompanyLogo").value;

      try {
        const response = await fetch("/admin/companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: companyName,
            location: companyLocation,
            phone: companyPhone,
            logo: companyLogo,
          }),
        });

        if (response.ok) {
          alert("Company created successfully!");
          location.reload();
        } else {
          const errorData = await response.json();
          alert(`Error creating company: ${errorData.message}`);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while creating the company.");
      }
    });
  }

  // Edit Company Modal Logic
  const editCompanyModal = document.getElementById("editCompanyModal");
  editCompanyModal.addEventListener("show.bs.modal", function (event) {
    const button = event.relatedTarget;
    const companyId = button.getAttribute("data-company-id");
    const companyName = button.getAttribute("data-company-name");
    const companyLocation = button.getAttribute("data-company-location");
    const companyPhone = button.getAttribute("data-company-phone");

    document.getElementById("editCompanyId").value = companyId;
    document.getElementById("editCompanyName").value = companyName;
    document.getElementById("editCompanyLocation").value = companyLocation;
    document.getElementById("editCompanyPhone").value = companyPhone;
  });

  // Edit Company Form Submission
  const editCompanyForm = document.getElementById("editCompanyForm");
  if (editCompanyForm) {
    editCompanyForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const companyId = document.getElementById("editCompanyId").value;
      const companyName = document.getElementById("editCompanyName").value;
      const companyLocation = document.getElementById(
        "editCompanyLocation"
      ).value;
      const companyPhone = document.getElementById("editCompanyPhone").value;
      const companyLogo = document.getElementById("editCompanyLogo").value;

      try {
        const response = await fetch(`/admin/companies/${companyId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: companyName,
            location: companyLocation,
            phone: companyPhone,
            logo: companyLogo,
          }),
        });

        if (response.ok) {
          alert("Company updated successfully!");
          location.reload();
        } else {
          const errorData = await response.json();
          alert(`Error updating company: ${errorData.message}`);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while updating the company.");
      }
    });
  }

  // Delete Company Modal Logic
  const deleteCompanyModal = document.getElementById("deleteCompanyModal");
  deleteCompanyModal.addEventListener("show.bs.modal", function (event) {
    const button = event.relatedTarget;
    const companyId = button.getAttribute("data-company-id");
    const companyName = button.getAttribute("data-company-name");

    document.getElementById("deleteCompanyId").value = companyId;
    document.getElementById("companyNameToDelete").textContent = companyName;
  });

  // Delete Company Confirmation
  const confirmDeleteCompanyBtn = document.getElementById(
    "confirmDeleteCompanyBtn"
  );
  if (confirmDeleteCompanyBtn) {
    confirmDeleteCompanyBtn.addEventListener("click", async function () {
      const companyId = document.getElementById("deleteCompanyId").value;

      try {
        const response = await fetch(`/admin/companies/${companyId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          alert("Company deleted successfully!");
          location.reload();
        } else {
          const errorData = await response.json();
          alert(`Error deleting company: ${errorData.message}`);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while deleting the company.");
      }
    });
  }
});
