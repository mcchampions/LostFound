package me.qscbm.projects.lostfound.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class CsrfOriginFilterTest {

    private final CsrfOriginFilter filter = new CsrfOriginFilter("https://app.example.com");

    @Test
    void rejectsMalformedRefererForCookieAuthenticatedWrite() throws Exception {
        MockHttpServletRequest request = authenticatedPost();
        request.addHeader("Referer", "://invalid");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
        verify(chain, never()).doFilter(request, response);
    }

    @Test
    void acceptsAllowedRefererForCookieAuthenticatedWrite() throws Exception {
        MockHttpServletRequest request = authenticatedPost();
        request.addHeader("Referer", "https://app.example.com/profile");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    @Test
    void acceptsNonBrowserWriteWithoutOriginMetadata() throws Exception {
        MockHttpServletRequest request = authenticatedPost();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    private MockHttpServletRequest authenticatedPost() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setCookies(new Cookie("AUTH_TOKEN", "token"));
        return request;
    }
}
