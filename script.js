// ===== Post Data =====
const writeups = [
  {
    title: "HTB: Connected — Full Walkthrough",
    category: "writeup",
    date: "2025-06-20",
    excerpt: "Exploiting SQL injection to RCE on a HackTheBox machine, covering enumeration through privilege escalation.",
    tags: ["htb", "sqli", "rce"]
  },
  {
    title: "Abusing Unconstrained Delegation in AD",
    category: "writeup",
    date: "2025-05-15",
    excerpt: "Leveraging unconstrained delegation to compromise a domain controller via Kerberos ticket theft.",
    tags: ["active-directory", "kerberos", "delegation"]
  },
  {
    title: "NTLM Relay & Forced Authentication",
    category: "writeup",
    date: "2025-05-10",
    excerpt: "Forcing NTLM authentication callbacks to capture and relay credentials across the network.",
    tags: ["ntlm", "relay", "credentials"]
  },
  {
    title: "Nexus Repository — Path Traversal to RCE",
    category: "writeup",
    date: "2025-04-22",
    excerpt: "Exploiting CVE-2024-4956 in Sonatype Nexus Repository Manager for unauthenticated file read.",
    tags: ["cve", "nexus", "path-traversal"]
  }
];

const notes = [
  {
    title: "AD ACLs Cheatsheet",
    category: "cheatsheet",
    date: "2025-06-01",
    excerpt: "Quick reference for exploiting Active Directory ACL misconfigurations — GenericAll, WriteDACL, and more.",
    tags: ["active-directory", "acl", "cheatsheet"]
  },
  {
    title: "Linux Privilege Escalation Notes",
    category: "notes",
    date: "2025-03-18",
    excerpt: "Common privesc vectors: SUID binaries, capabilities, cron jobs, PATH hijacking, and kernel exploits.",
    tags: ["linux", "privesc", "enumeration"]
  }
];

// ===== Render Posts =====
function renderPosts(data, containerId) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = data.map(post => `
    <a class="post-card" href="#">
      <div class="post-header">
        <span class="post-category">${post.category}</span>
        <span class="post-date">${post.date}</span>
      </div>
      <h3 class="post-title">${post.title}</h3>
      <p class="post-excerpt">${post.excerpt}</p>
      <div class="post-tags">
        ${post.tags.map(t => `<span class="post-tag">#${t}</span>`).join('')}
      </div>
    </a>
  `).join('');
}

renderPosts(writeups, 'posts-grid');
renderPosts(notes, 'notes-grid');

// ===== Active Nav Link on Scroll =====
const sections = document.querySelectorAll('section, header');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 120) {
      current = s.id;
    }
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.section === current);
  });
});

// ===== Particle Background =====
(function() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let w, h, particles;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function init() {
    resize();
    const count = Math.floor((w * h) / 18000);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      o: Math.random() * 0.4 + 0.1
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(129,140,248,${p.o})`;
      ctx.fill();
    });

    // Draw lines between close particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = dx * dx + dy * dy;
        if (dist < 12000) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(99,102,241,${0.06 * (1 - dist / 12000)})`;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); });
  init();
  draw();
})();
