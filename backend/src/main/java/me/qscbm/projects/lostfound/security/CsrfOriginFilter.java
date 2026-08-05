package me.qscbm.projects.lostfound.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class CsrfOriginFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of(
            HttpMethod.GET.name(), HttpMethod.HEAD.name(), HttpMethod.OPTIONS.name());
    private static final String AUTH_COOKIE = "AUTH_TOKEN";

    private final Set<String> allowedOrigins;

    public CsrfOriginFilter(
            @Value("${app.cors.allowed-origins:http://localhost:5173}") String allowedOrigins) {
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (SAFE_METHODS.contains(request.getMethod())
                || !hasAuthCookie(request)
                || isAllowedOrigin(request)) {
            filterChain.doFilter(request, response);
            return;
        }
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.getWriter().write("{\"code\":403,\"message\":\"请求来源不受信任\"}");
    }

    private boolean hasAuthCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return false;
        }
        return Arrays.stream(request.getCookies())
                .anyMatch(cookie -> AUTH_COOKIE.equals(cookie.getName())
                        && StringUtils.hasText(cookie.getValue()));
    }

    private boolean isAllowedOrigin(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (StringUtils.hasText(origin)) {
            return allowedOrigins.contains(origin);
        }
        String referer = request.getHeader("Referer");
        if (!StringUtils.hasText(referer)) {
            return true;
        }
        String refererOrigin = originFromReferer(referer);
        return StringUtils.hasText(refererOrigin) && allowedOrigins.contains(refererOrigin);
    }

    private String originFromReferer(String referer) {
        if (!StringUtils.hasText(referer)) {
            return null;
        }
        try {
            URI uri = URI.create(referer);
            return uri.getScheme() + "://" + uri.getRawAuthority();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
