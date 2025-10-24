
import React, { useState, useEffect, useRef, useCallback, Suspense, lazy, ComponentType, LazyExoticComponent } from 'react';
import { createRoot } from 'react-dom/client';

// --- Utility Functions ---
function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
    let inThrottle: boolean;
    let lastFunc: ReturnType<typeof setTimeout>;
    let lastRan: number;
    return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            lastRan = Date.now();
            inThrottle = true;
            lastFunc = setTimeout(() => {
                inThrottle = false;
            }, limit);
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    } as T;
}


// --- Reusable Icons (Memoized) ---
const SunIcon = React.memo(() => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
));

const MoonIcon = React.memo(() => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
));

const AwardIcon = React.memo(() => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7"></circle>
        <polyline points="8.21 13.89 7 23 12 17 17 23 15.79 13.88"></polyline>
    </svg>
));


// --- Intersection Observer Hook ---
interface IntersectionObserverOptions extends IntersectionObserverInit {
    triggerOnce?: boolean;
}

const useIntersectionObserver = (
    options: IntersectionObserverOptions = {}
): [React.Dispatch<React.SetStateAction<Element | null>>, boolean] => {
    const [element, setElement] = useState<Element | null>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (observer.current) {
            observer.current.disconnect();
        }

        if (element) {
            observer.current = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersecting(true);
                    if (options.triggerOnce && observer.current) {
                        observer.current.unobserve(entry.target);
                    }
                } else if (!options.triggerOnce) {
                     setIsIntersecting(false);
                }
            }, options);

            observer.current.observe(element);
        }

        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [element, options.threshold, options.root, options.rootMargin, options.triggerOnce]);

    return [setElement, isIntersecting];
};

// --- SectionWrapper (used by actual section components) ---
interface SectionWrapperProps {
    id: string;
    className?: string;
    children: React.ReactNode;
    title?: string;
    setRef: (el: HTMLElement | null) => void;
}

const SectionWrapper: React.FC<SectionWrapperProps> = React.memo(({ id, className, children, title, setRef }) => {
    const [containerRef, isSectionVisible] = useIntersectionObserver({ threshold: 0.1, triggerOnce: false });
    const [titleRef, isTitleVisible] = useIntersectionObserver({ threshold: 0.5, triggerOnce: false });

    const combinedRef = useCallback((el: HTMLElement | null) => {
        setRef(el); 
        containerRef(el); 
    }, [setRef, containerRef]);

    return (
        <section ref={combinedRef} id={id} className={`portfolio-section ${className || ''} ${isSectionVisible ? 'scroll-fade-up is-visible' : 'scroll-fade-up'}`}>
            {title && <h2 ref={titleRef} className={`section-title ${isTitleVisible ? 'is-visible' : ''}`}>{title}</h2>}
            {children}
        </section>
    );
});


// --- Actual Main Section Component Definitions ---
const AboutSection: React.FC<{ setRef: (el: HTMLElement | null) => void }> = React.memo(({ setRef }) => {
    return (
        <SectionWrapper setRef={setRef} id="about" className="about-section" title="About Me">
            <div className="about-content">
                <div className="about-text">
                    <p>
                        I am a dedicated Computer Science Engineer with a deep-seated passion for cybersecurity and robust software development. 
                        My journey in tech has equipped me with expert-level Java skills and proficiency in C++, allowing me to tackle complex challenges 
                        and build high-performance applications.
                    </p>
                    <p>
                        My core interest lies in the realm of cybersecurity, where I enjoy exploring threat landscapes, implementing security protocols,
                        and contributing to safer digital environments. I also have a foundational understanding of web technologies (HTML, CSS, JavaScript) 
                        and networking concepts (TCP/IP, DNS), which complements my software development and security expertise.
                    </p>
                    <p>
                        I thrive in collaborative environments and am always eager to learn new technologies and methodologies to enhance my skill set
                        and deliver impactful solutions.
                    </p>
                </div>
            </div>
        </SectionWrapper>
    );
});

const SkillCard: React.FC<{ title: string; skills: string[]; icon?: React.ReactNode; delay?: string }> = React.memo(({ title, skills, icon, delay }) => {
    const [ref, isVisible] = useIntersectionObserver({ threshold: 0.2, triggerOnce: false });
    return (
        <div ref={ref} className={`skill-card ${isVisible ? 'scroll-fade-up is-visible' : 'scroll-fade-up'}`} style={{ transitionDelay: delay }}>
            {icon && <div className={`skill-card-icon-wrapper ${isVisible ? 'scroll-fade-up is-visible' : 'scroll-fade-up'}`}>{icon}</div>}
            <h3 className="skill-card-title">{title}</h3>
            <ul>
                {skills.map(skill => <li key={skill}>{skill}</li>)}
            </ul>
        </div>
    );
});

const MemoizedCyberIcon = React.memo(() => <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>);
const MemoizedCodeIcon = React.memo(() => <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>);
const MemoizedWebIcon = React.memo(() => <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v10z"/></svg>);
const MemoizedNetworkIcon = React.memo(() => <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><path d="M17.31 15.26l-2.07-.9-.59.08C13.88 15.5 13 16.62 13 17.83V20H6v-2.17c0-1.21-.88-2.33-2.65-3.4-.07-.04-.15-.06-.22-.06-.32 0-.6.23-.6.55V17H1v-2.17c0-1.78 1.05-3.51 3-4.54V4h4.5v1.5H11V4h4.5v1.5H18V4h3v6.09c1.95 1.03 3 2.76 3 4.54V17h-2v-2.28c0-.32-.28-.55-.6-.55-.08 0-.15.02-.22.06l-2.12.91-.53-.07c-.77-.94-1.65-2.06-2.22-3.13zm-3.37-5.72H10.5V6H8v3.54H6.06c-1.61.86-2.06 2.09-2.06 3.03V15h1v-1.38c0-.77.58-1.57 2-2.17V9.54h1.56V11h.88v-1.46H12V11h.88v-1.46h1.56V11.4c.81.36 1.3.89 1.54 1.48L18.06 12l1.94.83V11c0-.94-.44-2.17-2.06-3.03H15.5V6H13v3.54h-.94l.88-2.82z"/></svg>);

const SkillsSection: React.FC<{ setRef: (el: HTMLElement | null) => void }> = React.memo(({ setRef }) => {
    const skillsData = [
        { title: "Cybersecurity", skills: ["Threat Analysis", "Penetration Testing (Basic)", "Network Security Concepts", "Vulnerability Assessment (Conceptual)"], icon: <MemoizedCyberIcon /> },
        { title: "Programming Languages", skills: ["Java (Expert)", "C++ (Proficient)", "Python (Intermediate)"], icon: <MemoizedCodeIcon /> },
        { title: "Web Technologies", skills: ["HTML5", "CSS3", "JavaScript (ES6+ Basics)", "React (Familiar)"], icon: <MemoizedWebIcon /> },
        { title: "Networking", skills: ["TCP/IP Suite", "DNS", "HTTP/S", "Basic Routing & Switching"], icon: <MemoizedNetworkIcon /> }
    ];

    return (
        <SectionWrapper setRef={setRef} id="skills" className="skills-section" title="My Expertise">
            <div className="skills-grid">
                {skillsData.map((skill, index) => (
                    <SkillCard key={skill.title} {...skill} delay={`${index * 0.1}s`} />
                ))}
            </div>
        </SectionWrapper>
    );
});

const ProjectCardArtSVG: React.FC = React.memo(() => (
    <svg className="project-card-art-svg" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="artGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className="svg-art-grad-start" />
                <stop offset="100%" className="svg-art-grad-end" />
            </linearGradient>
            <linearGradient id="artGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" className="svg-art-grad-start-alt" />
                <stop offset="100%" className="svg-art-grad-end-alt" />
            </linearGradient>
            <filter id="artBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
            </filter>
        </defs>
        <rect width="300" height="200" className="svg-art-bg" />
        
        <circle cx="50" cy="50" r="40" fill="url(#artGrad1)" opacity="0.7" filter="url(#artBlur)" />
        <rect x="150" y="30" width="100" height="100" fill="url(#artGrad2)" opacity="0.6" transform="rotate(15 200 80)" filter="url(#artBlur)"/>
        <path d="M 20 180 Q 150 100 280 180 Z" className="svg-art-line" strokeWidth="6" fill="none" opacity="0.5" />

        <circle cx="250" cy="150" r="25" className="svg-art-shape-accent" opacity="0.8" />
        <rect x="20" y="120" width="60" height="30" className="svg-art-shape-accent" opacity="0.7" transform="rotate(-10 50 135)" />

        <line x1="0" y1="100" x2="300" y2="100" className="svg-art-gridline" strokeWidth="1" opacity="0.2" />
        <line x1="100" y1="0" x2="100" y2="200" className="svg-art-gridline" strokeWidth="1" opacity="0.2" />
        <line x1="200" y1="0" x2="200" y2="200" className="svg-art-gridline" strokeWidth="1" opacity="0.2" />
    </svg>
));

const ProjectCard: React.FC<{ title: string; description: string; technologies: string[]; link?: string; delay?: string }> = 
    React.memo(({ title, description, technologies, link, delay }) => {
    const [ref, isVisible] = useIntersectionObserver({ threshold: 0.2, triggerOnce: false });
    return (
        <div ref={ref} className={`project-card ${isVisible ? 'scroll-fade-up is-visible' : 'scroll-fade-up'}`} style={{ transitionDelay: delay }}>
            <div className="project-card-image-placeholder">
                 <ProjectCardArtSVG />
            </div>
            <h3 className="project-card-title">{title}</h3>
            <p className="project-card-description">{description}</p>
            <div className="project-card-tech">
                {technologies.map(tech => <span key={tech} className="tech-tag">{tech}</span>)}
            </div>
            {link && <a href={link} target="_blank" rel="noopener noreferrer" className="project-card-link">View Project</a>}
        </div>
    );
});

const ProjectsSection: React.FC<{ setRef: (el: HTMLElement | null) => void }> = React.memo(({ setRef }) => {
    const projects = [
        { title: "Secure File Transfer Protocol", description: "A C++ application ensuring encrypted file transfers using modern cryptographic libraries.", technologies: ["C++", "OpenSSL", "Socket Programming"], link: "#" },
        { title: "Intrusion Detection System (PoC)", description: "A Java-based proof-of-concept IDS analyzing network packets for suspicious patterns.", technologies: ["Java", "Pcap4j", "Rule Engines"], link: "#" },
        { title: "Portfolio Website (This one!)", description: "Responsive personal portfolio built with React and TypeScript, featuring dark/light modes.", technologies: ["React", "TypeScript", "CSS3", "HTML5"], link: "#" }
    ];
    return (
        <SectionWrapper setRef={setRef} id="projects" className="projects-section" title="Featured Projects">
            <div className="projects-grid">
                {projects.map((p, index) => <ProjectCard key={p.title} {...p} delay={`${index * 0.1}s`} />)}
            </div>
        </SectionWrapper>
    );
});

interface Certificate {
    title: string;
    issuer: string;
    date: string;
    credentialLink?: string;
    icon?: React.ReactNode;
    delay?: string;
}

const CertificateCard: React.FC<Certificate> = React.memo(({ title, issuer, date, credentialLink, icon, delay }) => {
    const [ref, isVisible] = useIntersectionObserver({ threshold: 0.2, triggerOnce: false });
    return (
        <div ref={ref} className={`certificate-card ${isVisible ? 'scroll-fade-up is-visible' : 'scroll-fade-up'}`} style={{ transitionDelay: delay }}>
            {icon && <div className="certificate-card-icon">{icon}</div>}
            <div className="certificate-card-content">
                <h3 className="certificate-card-title">{title}</h3>
                <p className="certificate-card-issuer">{issuer}</p>
                <p className="certificate-card-date">{date}</p>
                {credentialLink && (
                    <a href={credentialLink} target="_blank" rel="noopener noreferrer" className="certificate-card-link">
                        View Credential
                    </a>
                )}
            </div>
        </div>
    );
});

const CertificatesSection: React.FC<{ setRef: (el: HTMLElement | null) => void }> = React.memo(({ setRef }) => {
    const certificates: Certificate[] = [
        { 
            title: "Cybersecurity Fundamentals", 
            issuer: "CyberCertify Inc.", 
            date: "Issued: Jan 2024", 
            credentialLink: "#", 
            icon: <AwardIcon />,
        },
        { 
            title: "Advanced Java Programming", 
            issuer: "CodeMaster Academy", 
            date: "Issued: Dec 2023", 
            credentialLink: "#",
            icon: <AwardIcon />,
        },
        { 
            title: "Networking Essentials", 
            issuer: "TechGrid Solutions", 
            date: "Issued: Nov 2023",
            icon: <AwardIcon />,
        },
         { 
            title: "React Web Development", 
            issuer: "Frontend Gurus", 
            date: "Issued: Oct 2023", 
            credentialLink: "#",
            icon: <AwardIcon />,
        },
    ];

    return (
        <SectionWrapper setRef={setRef} id="certificates" className="certificates-section" title="My Certifications">
            <div className="certificate-grid">
                {certificates.map((cert, index) => (
                    <CertificateCard key={cert.title} {...cert} delay={`${index * 0.1}s`} />
                ))}
            </div>
        </SectionWrapper>
    );
});

const ContactSection: React.FC<{ setRef: (el: HTMLElement | null) => void }> = React.memo(({ setRef }) => {
    return (
        <SectionWrapper setRef={setRef} id="contact" className="contact-section" title="Get In Touch">
            <p className="contact-subtitle">
                I'm always open to discussing new projects, creative ideas, or opportunities to be part of your visions.
            </p>
            <div className="contact-actions-wrapper">
                 <a href="mailto:shivamkv92@gmail.com" className="cta-button primary-cta">Email Me</a>
                 <div className="social-links-contact">
                    <a href="https://www.linkedin.com/in/shivam-kumar-165923260?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile"><svg fill="#5b647c" height="200px" width="200px" version="1.1" id="Icons" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32" xml:space="preserve" stroke="#5b647c"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M23,0H9C4,0,0,4,0,9v14c0,5,4,9,9,9h14c5,0,9-4,9-9V9C32,4,28,0,23,0z M12,25c0,0.6-0.4,1-1,1H7c-0.6,0-1-0.4-1-1V13 c0-0.6,0.4-1,1-1h4c0.6,0,1,0.4,1,1V25z M9,11c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S10.7,11,9,11z M26,25c0,0.6-0.4,1-1,1h-3 c-0.6,0-1-0.4-1-1v-3.5v-1v-2c0-0.8-0.7-1.5-1.5-1.5S18,17.7,18,18.5v2v1V25c0,0.6-0.4,1-1,1h-3c-0.6,0-1-0.4-1-1V13 c0-0.6,0.4-1,1-1h4c0.3,0,0.5,0.1,0.7,0.3c0.6-0.2,1.2-0.3,1.8-0.3c3,0,5.5,2.5,5.5,5.5V25z"></path> </g></svg></a>
                    <a href="https://github.com/samkv2" target="_blank" rel="noopener noreferrer" aria-label="GitHub Profile (Update Link)"><svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.08 2.94.83.09-.65.35-1.08.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.73c0 .27.18.58.69.48C19.13 20.17 22 16.42 22 12c0-5.52-4.48-10-10-10z"/></svg></a>
                </div>
            </div>
        </SectionWrapper>
    );
});

const Footer: React.FC = React.memo(() => {
    return (
        <footer className="portfolio-footer">
            <p>&copy; {new Date().getFullYear()} Shivam Kumar. All rights reserved.</p>
        </footer>
    );
});

// --- Expose AppSections globally ---
const AppSections = {
    AboutSection,
    SkillsSection,
    ProjectsSection,
    CertificatesSection,
    ContactSection,
    Footer
};
(window as any).AppSections = AppSections;

// --- Lazy Loaded Component Definitions (using standard React.lazy and components from global) ---
const LazyAboutSection = lazy(() => Promise.resolve({ default: (window as any).AppSections.AboutSection as ComponentType<any> }));
const LazySkillsSection = lazy(() => Promise.resolve({ default: (window as any).AppSections.SkillsSection as ComponentType<any> }));
const LazyProjectsSection = lazy(() => Promise.resolve({ default: (window as any).AppSections.ProjectsSection as ComponentType<any> }));
const LazyCertificatesSection = lazy(() => Promise.resolve({ default: (window as any).AppSections.CertificatesSection as ComponentType<any> }));
const LazyContactSection = lazy(() => Promise.resolve({ default: (window as any).AppSections.ContactSection as ComponentType<any> }));
const LazyFooter = lazy(() => Promise.resolve({ default: (window as any).AppSections.Footer as ComponentType<any> }));


// --- Other Portfolio Components (Header, Hero, etc.) ---
interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    onScrollToSection: (sectionId: string) => void;
    activeSectionId: string | null;
}

const navItemsConfig = [
    { id: 'hero', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'certificates', label: 'Certificates' },
    { id: 'contact', label: 'Contact' }
];

type MobileMenuDisplayState = 'hidden' | 'opening' | 'open' | 'closing';

const Header: React.FC<HeaderProps> = React.memo(({ theme, toggleTheme, onScrollToSection, activeSectionId }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuReallyOpen, setIsMobileMenuReallyOpen] = useState(false);
    const [mobileMenuDisplayState, setMobileMenuDisplayState] = useState<MobileMenuDisplayState>('hidden');
    
    const mobileMenuToggleRef = useRef<HTMLButtonElement>(null);
    const mainNavRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const openMobileMenu = useCallback(() => {
        if (mobileMenuToggleRef.current && mainNavRef.current) {
            const rect = mobileMenuToggleRef.current.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            mainNavRef.current.style.setProperty('--ripple-origin-x', `${x}px`);
            mainNavRef.current.style.setProperty('--ripple-origin-y', `${y}px`);
        }
        setMobileMenuDisplayState('opening');
        setIsMobileMenuReallyOpen(true);
    }, []);

    const closeMobileMenu = useCallback(() => {
        setMobileMenuDisplayState('closing');
        setIsMobileMenuReallyOpen(false);
    }, []);

    useEffect(() => {
        let timerId: number;
        if (mobileMenuDisplayState === 'opening') {
            timerId = window.setTimeout(() => {
                setMobileMenuDisplayState('open');
            }, 600); // Duration of ripple-open-anim
        } else if (mobileMenuDisplayState === 'closing') {
            timerId = window.setTimeout(() => {
                setMobileMenuDisplayState('hidden');
            }, 500); // Duration of ripple-close-anim
        }
        return () => clearTimeout(timerId);
    }, [mobileMenuDisplayState]);

    const handleToggleMobileMenu = useCallback(() => {
        if (isMobileMenuReallyOpen) {
            if (mobileMenuDisplayState === 'open' || mobileMenuDisplayState === 'opening') {
                closeMobileMenu();
            }
        } else {
            if (mobileMenuDisplayState === 'hidden' || mobileMenuDisplayState === 'closing') {
                openMobileMenu();
            }
        }
    }, [isMobileMenuReallyOpen, mobileMenuDisplayState, openMobileMenu, closeMobileMenu]);
    
    const navLinkHandler = useCallback((sectionId: string) => {
        onScrollToSection(sectionId);
        if (isMobileMenuReallyOpen) {
            closeMobileMenu();
        }
    }, [onScrollToSection, isMobileMenuReallyOpen, closeMobileMenu]);
    
    let navClassName = "main-nav";
    if (mobileMenuDisplayState !== 'hidden') {
        navClassName += " visible";
        if (mobileMenuDisplayState === 'opening') {
            navClassName += " animate-open";
        } else if (mobileMenuDisplayState === 'open') {
            navClassName += " is-fully-open";
        } else if (mobileMenuDisplayState === 'closing') {
            navClassName += " animate-close";
        }
    }

    return (
        <header className={`portfolio-header ${isScrolled ? 'scrolled' : ''} ${isMobileMenuReallyOpen || mobileMenuDisplayState === 'opening' ? 'mobile-menu-active' : ''}`}>
            <div className="header-content-wrapper"> 
                <a href="#hero" onClick={(e) => {e.preventDefault(); navLinkHandler('hero');}} className="logo">
                  Shivam Kumar
                </a>

                <nav className="desktop-main-nav">
                    <ul>
                        {navItemsConfig.map(item => (
                            <li key={item.id} className={activeSectionId === item.id ? 'active' : ''}>
                                <a 
                                    href={`#${item.id}`}
                                    onClick={(e) => {
                                        e.preventDefault(); 
                                        navLinkHandler(item.id);
                                    }}
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                
                <div className="header-actions">
                     <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                    </button>
                </div>

                <button 
                    ref={mobileMenuToggleRef}
                    className={`mobile-menu-toggle ${isMobileMenuReallyOpen || mobileMenuDisplayState === 'opening' ? 'is-active' : ''}`} 
                    onClick={handleToggleMobileMenu} 
                    aria-label="Toggle navigation menu"
                    aria-expanded={isMobileMenuReallyOpen || mobileMenuDisplayState === 'opening'}
                >
                    <span className="hamburger-lines-container">
                        <span className="line line-top"></span>
                        <span className="line line-middle"></span>
                        <span className="line line-bottom"></span>
                    </span>
                </button>
            </div>

            <nav ref={mainNavRef} className={navClassName} aria-hidden={mobileMenuDisplayState === 'hidden'}>
                <div className="nav-ripple-effect"></div>
                <ul>
                   {navItemsConfig.map(item => (
                        <li key={item.id} className={activeSectionId === item.id ? 'active' : ''}>
                            <a 
                                href={`#${item.id}`}
                                onClick={(e) => {
                                    e.preventDefault(); 
                                    navLinkHandler(item.id);
                                }}
                            >
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
                 <div className="mobile-nav-actions">
                     <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                    </button>
                </div>
            </nav>
        </header>
    );
});

interface TypedCharacter {
    char: string;
    key: string;
}

const HeroSection: React.FC<{ onScrollToSection: (sectionId: string) => void, setRef: (el: HTMLElement | null) => void }> = 
    React.memo(({ onScrollToSection, setRef }) => {
    const fullName = "Shivam Kumar";
    const [typedNameChars, setTypedNameChars] = useState<TypedCharacter[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTypingForward, setIsTypingForward] = useState(true);

    const typingSpeed = 120; 
    const backspaceSpeed = 70;
    const pauseAtEndDuration = 1500;

    const [heroContentRef, isHeroContentVisible] = useIntersectionObserver({ threshold: 0.1, triggerOnce: true });
    
    useEffect(() => {
        let timeoutId: number;
        if (isTypingForward) {
            if (currentIndex < fullName.length) {
                timeoutId = window.setTimeout(() => {
                    setTypedNameChars((prev) => [
                        ...prev, 
                        { char: fullName[currentIndex], key: `char-fwd-${currentIndex}-${Date.now()}` }
                    ]);
                    setCurrentIndex((prev) => prev + 1);
                }, typingSpeed);
            } else {
                timeoutId = window.setTimeout(() => setIsTypingForward(false), pauseAtEndDuration);
            }
        } else {
            if (currentIndex > 0) {
                timeoutId = window.setTimeout(() => {
                    setTypedNameChars((prev) => prev.slice(0, -1));
                    setCurrentIndex((prev) => prev - 1);
                }, backspaceSpeed);
            } else {
                timeoutId = window.setTimeout(() => setIsTypingForward(true), pauseAtEndDuration);
            }
        }
        return () => window.clearTimeout(timeoutId);
    }, [currentIndex, isTypingForward, fullName, typingSpeed, backspaceSpeed, pauseAtEndDuration]);
    
    return (
        <section ref={setRef} id="hero" className="portfolio-section hero-section">
            <div ref={heroContentRef} className={`hero-content ${isHeroContentVisible ? 'scroll-fade-up is-visible' : 'scroll-fade-up'}`}>
                <h1 className="hero-title">
                    Hello, I'm{' '}
                    <span className="highlight-name typed-text-container">
                        {typedNameChars.map((charObj) => (
                            <span key={charObj.key} className="typed-char">
                                {charObj.char === ' ' ? '\u00A0' : charObj.char} 
                            </span>
                        ))}
                    </span>
                    <span className="cursor"></span>
                </h1>
                <p className="hero-subtitle">CSE Engineer | Cybersecurity Specialist | Software Developer</p>
                <p className="hero-description">
                    Passionate about building secure and innovative software solutions. Expert in Java, proficient in C++, 
                    with a strong foundation in cybersecurity principles and networking.
                </p>
                <div className="hero-cta-buttons">
                    <button onClick={() => onScrollToSection('projects')} className="cta-button primary-cta">View My Work</button>
                    <a href="resumeShivam.pdf" target="_blank" rel="noopener noreferrer" className="cta-button secondary-cta">Download Resume</a>
                    <button onClick={() => onScrollToSection('contact')} className="cta-button secondary-cta">Get In Touch</button>
                </div>
            </div>
        </section>
    );
});

// --- Section Loader for Suspense ---
const SectionLoader: React.FC = () => (
    <div className="section-loader">
        <div className="spinner"></div>
        <p>Loading Content...</p>
    </div>
);

// --- Landing Page Component ---
const LandingPage: React.FC<{ theme: 'light' | 'dark'; toggleTheme: () => void; }> = 
    ({ theme, toggleTheme }) => {
    
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const landingContainerRef = useRef<HTMLDivElement>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>('hero');
    
    const sectionRefs = useRef<{[key: string]: HTMLElement | null}>({});
    
    const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
        sectionRefs.current[id] = el;
    }, []);

    useEffect(() => {
        const observerOptions = {
            root: null, 
            rootMargin: "-40% 0px -40% 0px", 
            threshold: 0, 
        };

        const callback = (entries: IntersectionObserverEntry[]) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                   setActiveSectionId(entry.target.id);
                }
            });
        };
        
        const observer = new IntersectionObserver(callback, observerOptions);
        const currentRefs = sectionRefs.current;
        Object.values(currentRefs).forEach(refVal => {
            if (refVal) observer.observe(refVal);
        });

        return () => {
            Object.values(currentRefs).forEach(refVal => {
                if (refVal) observer.unobserve(refVal);
            });
        };
    }, []); 


    const throttledSetMousePos = useCallback(throttle((newMousePos: {x: number, y: number}) => {
        setMousePos(newMousePos);
    }, 50), []); 

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (landingContainerRef.current) {
                const { clientX, clientY } = event;
                const { innerWidth, innerHeight } = window;
                const x = (clientX / innerWidth - 0.5) * 2;
                const y = (clientY / innerHeight - 0.5) * 2;
                throttledSetMousePos({ x, y });
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [throttledSetMousePos]);

    const scrollToSection = useCallback((sectionId: string) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    return (
        <div className="landing-page-container" ref={landingContainerRef}>
            <div className="portfolio-parallax-bg">
                <div className="portfolio-parallax-layer p-layer-1" style={{ transform: `translate(${mousePos.x * 8}px, ${mousePos.y * 12}px)` }}></div>
                <div className="portfolio-parallax-layer p-layer-2" style={{ transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -20}px)` }}></div>
                <div className="portfolio-parallax-layer p-layer-3" style={{ transform: `translate(${mousePos.x * 22}px, ${mousePos.y * -10}px)` }}></div>
                 <div className="portfolio-parallax-layer p-layer-4" style={{ transform: `translate(${mousePos.x * -10}px, ${mousePos.y * 25}px)` }}></div>
            </div>
            <Header theme={theme} toggleTheme={toggleTheme} onScrollToSection={scrollToSection} activeSectionId={activeSectionId} />
            <main className="portfolio-main-content">
                <HeroSection onScrollToSection={scrollToSection} setRef={setSectionRef('hero')} />
                <Suspense fallback={<SectionLoader />}>
                    <LazyAboutSection setRef={setSectionRef('about')} />
                    <LazySkillsSection setRef={setSectionRef('skills')} />
                    <LazyProjectsSection setRef={setSectionRef('projects')} />
                    <LazyCertificatesSection setRef={setSectionRef('certificates')} />
                    <LazyContactSection setRef={setSectionRef('contact')} />
                </Suspense>
            </main>
            <Suspense fallback={null}> 
                <LazyFooter />
            </Suspense>
        </div>
    );
};


// --- Main App Component ---
const App = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        const storedTheme = localStorage.getItem('portfolio-theme') as 'light' | 'dark' | null;
        if (storedTheme) {
            setTheme(storedTheme);
        } else {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
        }
    }, []);
    
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('portfolio-theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    }, []);
    
    return <LandingPage theme={theme} toggleTheme={toggleTheme} />;
};


// --- Render Application ---
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
    