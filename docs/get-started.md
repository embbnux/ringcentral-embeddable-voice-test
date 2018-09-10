# Get Started

there are two ways to integrate this widget to a web application:

## Adapter JS way

Just add following the following codes to a website's header. It will create a iframe in your website.

```js
<script>
  (function() {
    var rcs = document.createElement("script");
    rcs.src = "https://ringcentral.github.io/ringcentral-embeddable/adapter.js";
    var rcs0 = document.getElementsByTagName("script")[0];
    rcs0.parentNode.insertBefore(rcs, rcs0);
  })();
</script>
```

## Iframe way

Create a iframe with the following codes:

```html
<iframe width="300" height="500" id="rc-widget" allow="microphone" src="https://ringcentral.github.io/ringcentral-embeddable/app.html">
</iframe>
```

You can also customize the Widget to use your RingCentral app client id and client secrect in [here](config-client-id-and-secret.md).

#### Stable version

We provide latest RingCentral Embeddable version on github page `https://ringcentral.github.io/ringcentral-embeddable`. It includes latest features and bugfix in RingCentral Embeddable. And it will keep up to date with master codes. But we **recommend** developers to use versioned RingCentral Embeddable. Current latest stable version of RingCentral Embeddable is `0.1.0`. You can get `0.1.0` app in this uri `https://apps.ringcentral.com/integration/ringcentral-embeddable/0.1.0`.

Just replace `https://ringcentral.github.io/ringcentral-embeddable` in docs to the versioned uri, and you will be using versioned RingCentral Embeddable. The versioned app will not be influenced when new features are added, so it will be more stable than latest version. When you need to update RingCentral Embeddable, you need to update the versioned app uri in your codes manually.

To get all versions of RingCentral Embeddable in [here](https://github.com/ringcentral/ringcentral-embeddable/releases).

Example scripts with versioned app:

```js
<script>
  (function() {
    var rcs = document.createElement("script");
    rcs.src = "https://apps.ringcentral.com/integration/ringcentral-embeddable/0.1.0/adapter.js";
    var rcs0 = document.getElementsByTagName("script")[0];
    rcs0.parentNode.insertBefore(rcs, rcs0);
  })();
</script>
```
