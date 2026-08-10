package com.faeiq.ClothNCare;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = "jwt.secret=test-only-secret-key-for-context-load-tests")
class ClothNCareApplicationTests {

	@Test
	void contextLoads() {
	}

}
