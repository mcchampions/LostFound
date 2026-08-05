package me.qscbm.projects.lostfound.security;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SecurityConfigTest {

    @Test
    void registersJwtFilterBeforeUsingItAsCsrfFilterAnchor() {
        HttpSecurity http = mock(HttpSecurity.class);
        JwtAuthFilter jwtAuthFilter = mock(JwtAuthFilter.class);
        CsrfOriginFilter csrfOriginFilter = mock(CsrfOriginFilter.class);
        when(http.addFilterBefore(any(), any())).thenReturn(http);

        SecurityConfig.registerCustomFilters(http, jwtAuthFilter, csrfOriginFilter);

        InOrder order = inOrder(http);
        order.verify(http).addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        order.verify(http).addFilterBefore(csrfOriginFilter, JwtAuthFilter.class);
    }
}
