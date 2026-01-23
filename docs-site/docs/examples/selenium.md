---
sidebar_position: 3
---

# Selenium Example

E2E testing with Selenium WebDriver and Ephemera.

## Python + Selenium

```python
import os
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from ephemera import EphemeraClient

@pytest.fixture
def ephemera():
    return EphemeraClient(os.environ["EPHEMERA_API_KEY"])

@pytest.fixture
def browser():
    driver = webdriver.Chrome()
    driver.implicitly_wait(10)
    yield driver
    driver.quit()

def test_signup_verification(ephemera, browser):
    # Create temporary inbox
    inbox = ephemera.create_inbox()

    # Fill signup form
    browser.get("http://localhost:3000/signup")
    browser.find_element(By.NAME, "email").send_keys(inbox.address)
    browser.find_element(By.NAME, "password").send_keys("SecurePass123!")
    browser.find_element(By.CSS_SELECTOR, "button[type=submit]").click()

    # Wait for verification email
    message = ephemera.wait_for_email(
        inbox.id,
        subject="Verify",
        timeout=30
    )

    # Extract and enter code
    code = ephemera.extract_code(message)
    browser.find_element(By.NAME, "code").send_keys(code)
    browser.find_element(By.XPATH, "//button[text()='Verify']").click()

    # Assert success
    WebDriverWait(browser, 10).until(
        EC.visibility_of_element_located((By.CLASS_NAME, "welcome"))
    )

    # Cleanup
    ephemera.delete_inbox(inbox.id)
```

## Java + Selenium

```java
import com.ephemera.sdk.EphemeraClient;
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;

class SignupTest {
    private WebDriver driver;
    private EphemeraClient ephemera;

    @BeforeEach
    void setup() {
        driver = new ChromeDriver();
        ephemera = new EphemeraClient(System.getenv("EPHEMERA_API_KEY"));
    }

    @AfterEach
    void teardown() {
        driver.quit();
    }

    @Test
    void testSignupVerification() throws Exception {
        var inbox = ephemera.createInbox();

        driver.get("http://localhost:3000/signup");
        driver.findElement(By.name("email")).sendKeys(inbox.getAddress());
        driver.findElement(By.name("password")).sendKeys("SecurePass123!");
        driver.findElement(By.cssSelector("button[type=submit]")).click();

        var message = ephemera.waitForEmail(
            inbox.getId(), "Verify", null, Duration.ofSeconds(30)
        );

        var code = ephemera.extractCode(message);
        driver.findElement(By.name("code")).sendKeys(code);
        driver.findElement(By.xpath("//button[text()='Verify']")).click();

        Assertions.assertTrue(
            driver.findElement(By.className("welcome")).isDisplayed()
        );

        ephemera.deleteInbox(inbox.getId());
    }
}
```
