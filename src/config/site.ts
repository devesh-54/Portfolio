export interface SiteConfig {
  name: string
  role: string
  education: string
  location: string
  email: string
  github: string
  linkedin: string
  resumeUrl: string
  languages: string[]
  focus: string[]
  bio: string[]
}

export const site: SiteConfig = {
  name: "Devesh",
  role: "AI & Full-Stack Developer",
  education: "B.Tech Artificial Intelligence & Data Science, Rajalakshmi Institute of Technology (RIT), Chennai",
  location: "India",
  email: "deveshdhanush73@gmail.com",
  github: "https://github.com/devesh-54",
  linkedin: "https://www.linkedin.com/in/devesh-s-6097a6370",
  resumeUrl: "/resume.pdf",
  languages: ["English", "Tamil", "Telugu"],
  focus: ["AI & Deep Learning", "Full-Stack Web", "Mobile Apps"],
  bio: [
    "Undergraduate AI & Data Science student at Rajalakshmi Institute of Technology with a strong focus on deep learning and modern web technologies.",
    "Passionate about building intelligent, real-world full-stack applications and offline-capable mobile tools.",
    "Driven by solving practical engineering challenges through performant architectures and machine learning systems."
  ]
}

export default site
