// Initialize animations when content is in viewport
document.addEventListener("DOMContentLoaded", function () {
  // Intersection Observer for scroll animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-on-scroll");

          // For counter animations
          if (entry.target.classList.contains("counter")) {
            const target = parseInt(entry.target.getAttribute("data-target"));
            const duration = 2000; // 2 seconds
            const start = 0;
            const increment = target / (duration / 16);
            let current = start;

            const counter = setInterval(() => {
              current += increment;
              entry.target.textContent =
                Math.floor(current) +
                (entry.target.textContent.includes("%") ? "%" : "+");

              if (current >= target) {
                entry.target.textContent =
                  target + (entry.target.textContent.includes("%") ? "%" : "+");
                clearInterval(counter);
              }
            }, 16);
          }

          // Unobserve after animation is triggered
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
    }
  );

  // Observe all animated elements
  document
    .querySelectorAll(".fade-in-up, .fade-in-left, .fade-in-right, .counter")
    .forEach((el) => {
      observer.observe(el);
    });

  // Set sequential delays for metric animations
  document.querySelectorAll(".metric-animate").forEach((el, idx) => {
    el.style.setProperty("--idx", idx);
  });

  // Back to top button
  const backToTopButton = document.querySelector(".back-to-top");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      backToTopButton.classList.add("active");
    } else {
      backToTopButton.classList.remove("active");
    }
  });

  backToTopButton.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  // Show cookie consent after 2 seconds
  setTimeout(() => {
    document.querySelector(".cookie-consent").style.display = "block";
  }, 2000);

  // Close cookie consent
  document
    .querySelector(".cookie-consent .btn-primary")
    .addEventListener("click", () => {
      document.querySelector(".cookie-consent").style.display = "none";
    });

  // Testimonial slider dots functionality
  document.querySelectorAll(".slider-dot").forEach((dot, idx) => {
    dot.addEventListener("click", () => {
      document
        .querySelectorAll(".slider-dot")
        .forEach((d) => d.classList.remove("active"));
      dot.classList.add("active");
      // Here you would add logic to change the testimonials displayed
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      if (this.getAttribute("href") !== "#") {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 80,
            behavior: "smooth",
          });
        }
      }
    });
  });

  // Display notification animation after 3 seconds
  setTimeout(() => {
    document.querySelector(".notification-animate").style.opacity = "1";
  }, 3000);
});
