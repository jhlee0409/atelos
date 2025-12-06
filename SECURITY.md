# Security Advisory

## CVE-2025-55182: React Server Components Remote Code Execution

**Severity**: Critical
**Published**: December 3, 2025
**Status**: ✅ PATCHED

### Summary

A critical-severity vulnerability in React Server Components (CVE-2025-55182) affects React 19 and frameworks that use it, including Next.js (CVE-2025-66478). Under certain conditions, specially crafted requests could lead to unintended remote code execution.

### Current Project Status

| Package | Current Version | Status | Required Version |
|---------|-----------------|--------|------------------|
| Next.js | 15.2.6 | ✅ PATCHED | 15.2.6+ |
| React | 19.2.1 | ✅ PATCHED | 19.1.2+ |

### Impact

Applications using affected versions of the React Server Components implementation may process untrusted input in a way that allows an attacker to perform remote code execution.

**Affected packages:**
- `react-server-dom-parcel` (19.0.0, 19.1.0, 19.1.1, 19.2.0)
- `react-server-dom-webpack` (19.0.0, 19.1.0, 19.1.1, 19.2.0)
- `react-server-dom-turbopack` (19.0.0, 19.1.0, 19.1.1, 19.2.0)

**Affected frameworks:**
- Next.js versions ≥14.3.0-canary.77, ≥15, and ≥16
- Other frameworks using React Server Components (Vite, Parcel, React Router, RedwoodSDK, Waku)

### Resolution

Upgrade to patched versions immediately:

**Fixed versions:**
- **React**: 19.0.1, 19.1.2, 19.2.1
- **Next.js**: 15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7, 15.6.0-canary.58, 16.0.7

### Remediation Steps

1. Update `package.json`:
   ```json
   {
     "dependencies": {
       "next": "15.2.6",
       "react": "^19.1.2",
       "react-dom": "^19.1.2"
     }
   }
   ```

2. Run package manager update:
   ```bash
   pnpm update next react react-dom
   ```

3. Verify the update:
   ```bash
   pnpm list next react react-dom
   ```

4. Test the application thoroughly before deploying.

### Temporary Mitigations

If hosted on Vercel, WAF rules have been deployed to provide some protection. However, **do not rely on the WAF for full protection** - immediate upgrades are required.

### References

- [Vercel Security Advisory](https://vercel.com/blog/cve-2025-55182)
- [Next.js GHSA](https://github.com/vercel/next.js/security/advisories)
- [React GHSA](https://github.com/facebook/react/security/advisories)

### Credit

Thanks to Lachlan Davidson for identifying and responsibly reporting the vulnerability, and the Meta Security and React team for their partnership.

---

**Last Updated**: December 6, 2025
