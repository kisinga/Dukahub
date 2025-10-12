document.getElementById("current-year").textContent = new Date().getFullYear();
// Simple animation trigger using Intersection Observer API (via Alpine x-intersect)
// Add 'animate-fade-in-up', 'animate-fade-in-left', 'animate-fade-in-right', 'animate-fade-in' classes
// to elements you want to animate when they enter the viewport.
// The CSS handles the actual animation definition and initial state.
document.addEventListener("alpine:init", () => {
  Alpine.directive("animate-on-scroll", (el) => {
    let observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            // Optional: Unobserve after first intersection
            // observer.unobserve(el);
          } else {
            // Optional: Remove class if you want animation to repeat
            // el.classList.remove('is-visible');
          }
        });
      },
      { threshold: 0.1 }
    ); // Trigger when 10% visible

    observer.observe(el);
  });

  // Add collapse transition for FAQ
  Alpine.magic("collapse", (el) => {
    let duration = 300; // Or your desired duration

    // Set initial styles for transition
    el.style.height = "0px";
    el.style.overflow = "hidden";

    return (show) => {
      let targetHeight = show ? el.scrollHeight + "px" : "0px";
      el.style.transitionProperty = "height";
      el.style.transitionDuration = `${duration}ms`;
      el.style.transitionTimingFunction = "ease-in-out"; // Or your preferred timing
      el.style.height = targetHeight;
    };
  });
});
